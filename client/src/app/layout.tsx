'use client';\n\nimport localFont from 'next/font/local';\nimport { QueryClient, QueryClientProvider } from 'react-query';\nimport { Toaster } from 'react-hot-toast';\nimport { AuthProvider } from '@/hooks/useAuth';\nimport { ThemeProvider } from '@/hooks/useTheme';\nimport '@/styles/globals.css';\n\nconst sfProDisplay = localFont({
  src: [
    {
      path: '../fonts/SFProDisplay-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/SFProDisplay-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/SFProDisplay-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../fonts/SFProDisplay-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-sf-pro-display',
  fallback: ['system-ui', 'sans-serif'],
});\n\nconst queryClient = new QueryClient({\n  defaultOptions: {\n    queries: {\n      refetchOnWindowFocus: false,\n      retry: 1,\n      staleTime: 5 * 60 * 1000, // 5 minutes\n    },\n  },\n});\n\nexport default function RootLayout({\n  children,\n}: {\n  children: React.ReactNode;\n}) {\n  return (\n    <html lang=\"en\" suppressHydrationWarning>\n      <head>\n        <title>TradeKeep Content Orchestrator</title>\n        <meta name=\"description\" content=\"Content strategy and creation optimization platform for TradeKeep\" />\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n        <link rel=\"icon\" href=\"/favicon.ico\" />\n      </head>\n      <body className={`${sfProDisplay.variable} font-sans bg-tk-black text-tk-white antialiased`}>\n        <QueryClientProvider client={queryClient}>\n          <ThemeProvider>\n            <AuthProvider>\n              <div className=\"min-h-screen bg-tk-black\">\n                {children}\n              </div>\n              <Toaster\n                position=\"top-right\"\n                toastOptions={{\n                  duration: 4000,\n                  style: {\n                    background: '#1F2937',\n                    color: '#FFFFFF',\n                    border: '1px solid #374151',\n                  },\n                  success: {\n                    iconTheme: {\n                      primary: '#10B981',\n                      secondary: '#FFFFFF',\n                    },\n                  },\n                  error: {\n                    iconTheme: {\n                      primary: '#EF4444',\n                      secondary: '#FFFFFF',\n                    },\n                  },\n                }}\n              />\n            </AuthProvider>\n          </ThemeProvider>\n        </QueryClientProvider>\n      </body>\n    </html>\n  );\n}