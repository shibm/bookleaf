import type {
  TicketInput,
  BookDetails,
  SuggestionResult,
} from '../../types.ts';
import { CATEGORIES, money } from '../../constants.ts';

export function fallback(
  ticket: TicketInput,
  book: BookDetails | null,
  name: string,
): SuggestionResult {
  const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
  let category = /isbn|metadata|description|bio/.test(text)
    ? CATEGORIES[1]
    : /royalt|payment|payout|paid|bank/.test(text)
      ? CATEGORIES[0]
      : /misprint|binding|blurry|misalign|print quality|defect|colour|color/.test(
            text,
          )
        ? CATEGORIES[2]
        : /amazon|flipkart|unavailable|distribution|listing/.test(text)
          ? CATEGORIES[3]
          : /production|typeset|cover|proofread|manuscript|publish|status/.test(
                text,
              )
            ? CATEGORIES[4]
            : CATEGORIES[5];
  const priority = /legal|fraud|lawsuit/.test(text)
    ? 'Critical'
    : (category === CATEGORIES[1] && /isbn/.test(text)) ||
        /6 months|six months|overdue|months.*(paid|payment|royalt)|urgent/.test(
          text,
        )
      ? 'High'
      : category === CATEGORIES[5] || /\bbio\b|description/.test(text)
        ? 'Low'
        : 'Medium';
  const detail = book
    ? `For “${book.title}”, our record shows ${book.status}. `
    : '';
  const replies = {
    [CATEGORIES[0]]: `${book ? `Your recorded royalties are ${money(book.total_royalty_earned)} earned, ${money(book.royalty_paid)} paid and ${money(book.royalty_pending)} pending. ` : ''}Royalties are calculated quarterly and paid within 45 days of quarter end, with a ₹1,000 minimum; smaller balances roll over. Your share is 80% of net profit after printing, platform commission and shipping, rather than 80% of MRP. Please confirm whether your bank account is linked, without sending bank details here. Our next step is to verify the payout cycle and request a line-by-line breakdown; we propose an update within 48 hours.`,
    [CATEGORIES[1]]: !/isbn/i.test(text)
      ? 'Please share the revised description, author bio, or other metadata you would like updated, along with the affected platform. Changes typically reflect within 3–5 business days after submission. Our next step is to review your requested update with the team.'
      : 'An ISBN mismatch requires a high-priority production review. Please share the affected listing URL and the ISBN printed on your copy. Our next step is to ask production to verify the mapping and provide an update within 48 hours. For description or other metadata changes, please send the revised text; updates typically reflect within 3–5 business days.',
    [CATEGORIES[2]]:
      'I’m sorry to hear about the quality concerns. Please reply with details of the defects and arrange to share photos with our team. After verification, BookLeaf provides a free reprint with a turnaround of 5–7 business days. Our next step is to review the evidence and confirm reprint eligibility.',
    [CATEGORIES[3]]:
      'An unavailable listing often indicates a stock sync issue. A re-sync can take 24–48 hours, while new listings normally take 7–10 business days after publication. Please share the platform and listing URL so our distribution team can verify the issue and arrange the appropriate next step.',
    [CATEGORIES[4]]:
      'I understand that waiting for a production update can be frustrating. We need production to confirm the current milestone, any approval needed, and an updated completion date. Our next step is to request that review and provide an update within 48 hours; the records available here do not establish a delay cause or completion date.',
    [CATEGORIES[5]]:
      'Thank you for reaching out. Please share any additional details that would help us understand your request. Our next step is to review it with the operations team and provide an update within 48 hours.',
  };
  return {
    category,
    priority,
    draft: `Hi ${name.split(' ')[0]},\n\nThank you for sharing your concern. ${detail}${replies[category]}\n\nWarm regards,\nBookLeaf Author Support`,
    reason:
      'Rule-based suggestion; AI unavailable or not configured. Review before sending.',
    state: 'fallback',
  };
}
