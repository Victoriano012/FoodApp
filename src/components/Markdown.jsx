import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// A recipe's free-text comment, rendered as GitHub-flavoured markdown
export default function Markdown({ children }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
