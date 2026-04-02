import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as map from 'lib0/map.js';
import * as encoding from 'lib0/encoding.js';
import * as decoding from 'lib0/decoding.js';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as authProtocol from 'y-protocols/auth';
import { LeveldbPersistence } from 'y-leveldb';

/** Match y-websocket client message types (y-websocket/src/y-websocket.js). */
const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;
const messageQueryAwareness = 3;

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

const gcEnabled = process.env.YJS_GC !== 'false' && process.env.YJS_GC !== '0';

const levelPath = process.env.Y_LEVELDB_PATH || process.env.COLLAB_LEVELDB_PATH || '';
let ldb = null;
if (levelPath) {
  console.info(`[collab] persisting Yjs documents to LevelDB at ${levelPath}`);
  ldb = new LeveldbPersistence(levelPath);
}

const docs = new Map();

/**
 * @param {string} docName
 * @param {Y.Doc} ydoc
 */
async function bindLeveldb(docName, ydoc) {
  if (!ldb) return;
  const persisted = await ldb.getYDoc(docName);
  Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persisted));
  persisted.destroy();
  ydoc.on('update', (update) => {
    ldb.storeUpdate(docName, update);
  });
}

class WSSharedDoc extends Y.Doc {
  /**
   * @param {string} name
   */
  constructor(name) {
    super({ gc: gcEnabled });
    this.name = name;
    /** @type {Map<import('ws').WebSocket, Set<number>>} */
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs = this.conns.get(conn);
        if (connControlledIDs !== undefined) {
          added.forEach((clientID) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID) => {
            connControlledIDs.delete(clientID);
          });
        }
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(this, c, buff);
      });
    };
    this.awareness.on('update', awarenessChangeHandler);

    this.on('update', (update) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      this.conns.forEach((_, conn) => {
        send(this, conn, message);
      });
    });
  }
}

/**
 * @param {WSSharedDoc} doc
 * @param {string} docname
 * @param {boolean} gc
 */
function getYDoc(docname, gc = true) {
  return map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    if (ldb) {
      bindLeveldb(docname, doc).catch((err) =>
        console.error('[collab] LevelDB bind failed', err)
      );
    }
    return doc;
  });
}

/**
 * @param {WSSharedDoc} doc
 * @param {import('ws').WebSocket} conn
 * @param {Uint8Array} m
 */
function send(doc, conn, m) {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(m, (err) => {
      if (err != null) closeConn(doc, conn);
    });
  } catch {
    closeConn(doc, conn);
  }
}

/**
 * @param {WSSharedDoc} doc
 * @param {import('ws').WebSocket} conn
 */
function closeConn(doc, conn) {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
    if (doc.conns.size === 0) {
      if (ldb) {
        ldb.flushDocument(doc.name).finally(() => {
          doc.destroy();
          docs.delete(doc.name);
        });
      } else {
        doc.destroy();
        docs.delete(doc.name);
      }
    }
  }
  try {
    conn.close();
  } catch {
    /* ignore */
  }
}

/**
 * @param {import('ws').WebSocket} conn
 * @param {WSSharedDoc} doc
 * @param {Uint8Array} message
 */
function messageListener(conn, doc, message) {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness:
        awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn);
        break;
      case messageQueryAwareness: {
        const reply = encoding.createEncoder();
        encoding.writeVarUint(reply, messageAwareness);
        encoding.writeVarUint8Array(
          reply,
          awarenessProtocol.encodeAwarenessUpdate(
            doc.awareness,
            Array.from(doc.awareness.getStates().keys())
          )
        );
        send(doc, conn, encoding.toUint8Array(reply));
        break;
      }
      case messageAuth:
        authProtocol.readAuthMessage(decoder, doc, (_ydoc, reason) => {
          console.warn('[collab] auth denied:', reason);
        });
        break;
      default:
        console.warn('[collab] unknown message type', messageType);
    }
  } catch (err) {
    console.error('[collab] message error', err);
  }
}

const pingTimeout = 30000;

/**
 * @param {import('ws').WebSocket} conn
 * @param {WSSharedDoc} doc
 */
function setupWSConnection(conn, doc) {
  conn.binaryType = 'arraybuffer';
  doc.conns.set(conn, new Set());
  conn.on('message', (message) => {
    messageListener(conn, doc, new Uint8Array(message));
  });

  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn);
      }
      clearInterval(pingInterval);
    } else if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);
  conn.on('close', () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });
  conn.on('pong', () => {
    pongReceived = true;
  });

  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const enc2 = encoding.createEncoder();
      encoding.writeVarUint(enc2, messageAwareness);
      encoding.writeVarUint8Array(
        enc2,
        awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys()))
      );
      send(doc, conn, encoding.toUint8Array(enc2));
    }
  }
}

/**
 * y-websocket clients use `new WebsocketProvider('ws://host:port/collab', 'room-name', doc)` →
 * WebSocket URL path `/collab/room-name`.
 * @param {http.Server} httpServer
 */
export function attachCollabWss(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost';
      const u = new URL(request.url || '/', `http://${host}`);
      if (!u.pathname.startsWith('/collab')) {
        return;
      }
      const room =
        u.pathname === '/collab' || u.pathname === '/collab/'
          ? 'default'
          : u.pathname.replace(/^\/collab\/?/, '') || 'default';
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, room);
      });
    } catch (e) {
      console.error('[collab] upgrade error', e);
      socket.destroy();
    }
  });

  wss.on('connection', (ws, _req, room) => {
    const doc = getYDoc(String(room), true);
    setupWSConnection(ws, doc);
  });

  return wss;
}
