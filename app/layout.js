import './globals.css'

export const metadata = {
  title: 'UP Network Panel',
  description: 'Offer Tracking Panel',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
