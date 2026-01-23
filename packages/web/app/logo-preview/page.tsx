import Image from "next/image"

export default function LogoPreviewPage() {
  return (
    <div className="min-h-screen p-8 space-y-16">
      <h1 className="text-3xl font-bold text-zinc-50">Logo Preview</h1>

      <section className="space-y-8">
        <h2 className="text-xl font-semibold text-zinc-300 border-b border-zinc-800 pb-2">
          SVG Logo Files
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Favicon */}
          <div className="space-y-2">
            <h3 className="text-sm text-zinc-500">Favicon (32x32)</h3>
            <div className="bg-zinc-900 p-4 rounded-lg inline-block">
              <Image src="/favicon.svg" alt="Favicon" width={32} height={32} />
            </div>
          </div>

          {/* Logo (icon only) */}
          <div className="space-y-2">
            <h3 className="text-sm text-zinc-500">Logo - icon only (140x120)</h3>
            <div className="bg-zinc-900 p-4 rounded-lg inline-block">
              <Image src="/logo.svg" alt="Logo" width={140} height={120} />
            </div>
          </div>

          {/* Logo wordmark */}
          <div className="space-y-2">
            <h3 className="text-sm text-zinc-500">Logo + Wordmark (140x150)</h3>
            <div className="bg-zinc-900 p-4 rounded-lg inline-block">
              <Image src="/logo-wordmark.svg" alt="Logo Wordmark" width={140} height={150} />
            </div>
          </div>

          {/* Logo wordmark large */}
          <div className="space-y-2">
            <h3 className="text-sm text-zinc-500">Logo + Wordmark (280x300)</h3>
            <div className="bg-zinc-900 p-4 rounded-lg inline-block">
              <Image src="/logo-wordmark.svg" alt="Logo Wordmark Large" width={280} height={300} />
            </div>
          </div>
        </div>

        {/* OG Image - Centered */}
        <div className="space-y-2">
          <h3 className="text-sm text-zinc-500">OG Image - Centered (SVG)</h3>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <Image
              src="/og-image.svg"
              alt="OG Image Centered"
              width={600}
              height={315}
              className="w-full max-w-2xl border border-zinc-800 rounded"
            />
          </div>
        </div>

        {/* OG Image - Centered PNG */}
        <div className="space-y-2">
          <h3 className="text-sm text-zinc-500">OG Image - Centered (PNG)</h3>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <Image
              src="/og-image.png"
              alt="OG Image Centered PNG"
              width={600}
              height={315}
              className="w-full max-w-2xl border border-zinc-800 rounded"
            />
          </div>
        </div>

        {/* OG Image - Horizontal */}
        <div className="space-y-2">
          <h3 className="text-sm text-zinc-500">OG Image - Horizontal (SVG)</h3>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <Image
              src="/og-image-horizontal.svg"
              alt="OG Image Horizontal"
              width={600}
              height={315}
              className="w-full max-w-2xl border border-zinc-800 rounded"
            />
          </div>
        </div>

        {/* OG Image - Horizontal PNG */}
        <div className="space-y-2">
          <h3 className="text-sm text-zinc-500">OG Image - Horizontal (PNG)</h3>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <img
              src={`/og-image-horizontal.png?v=${Date.now()}`}
              alt="Open Graph horizontal preview"
              width={600}
              height={315}
              className="w-full max-w-2xl border border-zinc-800 rounded"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
