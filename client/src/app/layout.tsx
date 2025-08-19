import './globals.css';

export const metadata = {
  title: 'TradeKeep Content Orchestrator',
  description: 'Content management system for TradeKeep construction company',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}