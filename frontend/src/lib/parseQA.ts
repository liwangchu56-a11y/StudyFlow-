/** 智能解析用户输入的 Q/A 文本为卡片列表.
 * 支持的格式:
 * 1) Q: 问题\nA: 答案  (单行内 Q+A 配对)
 * 2) Q: 问题\n   答案  (Q 标记 + 后面所有内容作为答案)
 * 3) 纯文本: 整段作为 question, answer 为空
 * 多张卡之间用空行分隔.
 */
export interface ParsedCard {
  question: string;
  answer: string;
  tag?: string;
}

const Q_PREFIXES = /^\s*(?:Q|问|问题|Question)\s*[:：．.]\s*/i;
const A_PREFIXES = /^\s*(?:A|答|答案|Answer)\s*[:：．.]\s*/i;

export function parseQA(text: string, defaultTag?: string): ParsedCard[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // 用空行切分卡片块
  const blocks = trimmed.split(/\n\s*\n+/);

  const out: ParsedCard[] = [];
  for (const block of blocks) {
    const card = parseBlock(block, defaultTag);
    if (card) out.push(card);
  }
  return out;
}

function parseBlock(block: string, defaultTag?: string): ParsedCard | null {
  const lines = block.split(/\n/).map((l) => l.trimEnd());
  let question = "";
  let answer = "";
  const answerLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (Q_PREFIXES.test(line)) {
      // 提取问题
      question = line.replace(Q_PREFIXES, "").trim();
    } else if (A_PREFIXES.test(line)) {
      // 提取答案, 答案可跨行
      answer = line.replace(A_PREFIXES, "").trim();
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (!next) continue;
        answerLines.push(next);
      }
      if (answerLines.length) {
        answer = answer ? answer + "\n" + answerLines.join("\n") : answerLines.join("\n");
      }
      break;
    } else if (!question) {
      // 第一个非空行, 既无 Q 标记也无 A 标记 → 整段作为问题
      question = line;
    } else {
      // 已经有 question, 把这一行追加到 answer
      answer = answer ? answer + "\n" + line : line;
    }
  }

  question = question.trim();
  answer = answer.trim();
  if (!question) return null;
  return {
    question,
    answer,
    ...(defaultTag ? { tag: defaultTag } : {}),
  };
}