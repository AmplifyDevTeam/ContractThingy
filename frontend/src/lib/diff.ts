export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type DiffChunk = { type: "equal" | "added" | "removed"; value: string };

export function diffLines(left: string, right: string): DiffChunk[] {
  const a = left.split("\n");
  const b = right.split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const chunks: DiffChunk[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      chunks.push({ type: "equal", value: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      chunks.push({ type: "removed", value: a[i] });
      i += 1;
    } else {
      chunks.push({ type: "added", value: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    chunks.push({ type: "removed", value: a[i] });
    i += 1;
  }
  while (j < m) {
    chunks.push({ type: "added", value: b[j] });
    j += 1;
  }
  return chunks;
}
