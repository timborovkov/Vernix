// Render the OpenAPI 3.1 spec as a plain-markdown reference document, for
// agents that ask for text/markdown on /docs. The Scalar-rendered HTML at
// /docs is client-JS heavy and not useful to non-browser consumers, so we
// produce markdown directly from the spec object instead of scraping HTML.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { buildOpenApiSpec } from "./openapi";

type AnySchema = Record<string, any>;

const METHOD_ORDER = ["get", "post", "put", "patch", "delete", "head", "options"] as const;

function summariseSchema(schema: AnySchema | undefined, depth = 0): string {
  if (!schema || depth > 3) return "";
  if (schema.$ref) return `\`${String(schema.$ref).split("/").pop()}\``;
  const t = schema.type;
  if (t === "array") {
    return `array<${summariseSchema(schema.items, depth + 1) || "any"}>`;
  }
  if (t === "object" || schema.properties) {
    const required = new Set<string>(schema.required ?? []);
    const entries = Object.entries<AnySchema>(schema.properties ?? {});
    if (entries.length === 0) return "object";
    const rows = entries
      .map(([k, v]) => {
        const req = required.has(k) ? " *(required)*" : "";
        const desc = v.description ? ` — ${v.description}` : "";
        return `  - \`${k}\`: ${summariseSchema(v, depth + 1)}${req}${desc}`;
      })
      .join("\n");
    return `object\n${rows}`;
  }
  if (schema.enum) {
    return `${t ?? "string"} enum: ${schema.enum.map((v: unknown) => JSON.stringify(v)).join(", ")}`;
  }
  if (Array.isArray(t)) return t.join(" | ");
  return t ?? "any";
}

function renderOperation(method: string, path: string, op: AnySchema): string {
  const out: string[] = [];
  out.push(`### ${method.toUpperCase()} ${path}`);
  if (op.summary) out.push(`**${op.summary}**`);
  if (op.description) out.push(op.description);

  const params = (op.parameters ?? []) as AnySchema[];
  if (params.length) {
    out.push("\n**Parameters:**\n");
    for (const p of params) {
      const req = p.required ? " *(required)*" : "";
      const type = summariseSchema(p.schema).split("\n")[0] || "string";
      const desc = p.description ? ` — ${p.description}` : "";
      out.push(`- \`${p.name}\` (${p.in}, ${type})${req}${desc}`);
    }
  }

  const rb = op.requestBody as AnySchema | undefined;
  if (rb?.content) {
    const [mime, media] = Object.entries<AnySchema>(rb.content)[0] ?? [];
    if (mime) {
      out.push(`\n**Request body** (\`${mime}\`):`);
      out.push(summariseSchema(media.schema));
    }
  }

  const responses = op.responses as Record<string, AnySchema> | undefined;
  if (responses) {
    out.push("\n**Responses:**");
    for (const [status, resp] of Object.entries(responses)) {
      const desc = resp.description ? ` — ${resp.description}` : "";
      const content = resp.content ? Object.entries<AnySchema>(resp.content)[0] : undefined;
      if (content) {
        const [mime, media] = content;
        out.push(`- \`${status}\` (${mime})${desc}`);
        const schema = summariseSchema(media.schema);
        if (schema && schema !== "any") out.push(`  ${schema.replace(/\n/g, "\n  ")}`);
      } else {
        out.push(`- \`${status}\`${desc}`);
      }
    }
  }

  return out.join("\n");
}

export function renderOpenApiMarkdown(): string {
  const spec = buildOpenApiSpec() as AnySchema;
  const lines: string[] = [];

  lines.push(`# ${spec.info?.title ?? "API"}`);
  if (spec.info?.version) lines.push(`Version: ${spec.info.version}`);
  if (spec.info?.description) {
    lines.push("");
    lines.push(spec.info.description);
  }

  // Servers
  if (Array.isArray(spec.servers) && spec.servers.length) {
    lines.push("\n## Servers\n");
    for (const s of spec.servers as AnySchema[]) {
      lines.push(`- \`${s.url}\`${s.description ? ` — ${s.description}` : ""}`);
    }
  }

  // Group paths by tag
  const byTag = new Map<string, string[]>();
  const untagged = "Other";
  for (const [path, item] of Object.entries<AnySchema>(spec.paths ?? {})) {
    for (const m of METHOD_ORDER) {
      const op = item[m] as AnySchema | undefined;
      if (!op) continue;
      const tag = (op.tags?.[0] as string) ?? untagged;
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push(renderOperation(m, path, op));
    }
  }

  for (const [tag, ops] of byTag) {
    lines.push(`\n## ${tag}\n`);
    lines.push(ops.join("\n\n"));
  }

  lines.push("");
  return lines.join("\n");
}
