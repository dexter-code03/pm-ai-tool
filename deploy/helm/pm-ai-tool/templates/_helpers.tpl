{{- define "pm-ai-tool.name" -}}
pm-ai-tool
{{- end }}

{{- define "pm-ai-tool.fullname" -}}
{{ include "pm-ai-tool.name" . }}
{{- end }}
