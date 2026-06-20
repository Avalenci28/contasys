import { useEffect } from 'react'

const AD_CLIENT_PLACEHOLDER = 'ca-pub-XXXXXXXXXXXXXXXX'

export default function AdSense({
  slot,
  format = 'auto',
  responsive = true,
  style,
}) {
  useEffect(() => {
    // Google requiere push luego de render
    try {
      if (!window.adsbygoogle) return
      window.adsbygoogle.push({})
    } catch (err) {
      // Evitar que un fallo de ads rompa la app
      // eslint-disable-next-line no-console
      console.error('AdSense push error:', err)
    }
  }, [slot, format, responsive])

  return (
    <ins
      className="adsbygoogle"
      style={style}
      data-ad-client={AD_CLIENT_PLACEHOLDER}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  )
}

