import Image from "next/image"

export default function LogoPreviewPage() {
  return (
    <div className="min-h-screen p-8 space-y-16">
      <h1 className="text-3xl font-bold text-zinc-50">Logo Preview</h1>

      <section className="space-y-8">
        <h2 className="text-xl font-semibold text-zinc-300 border-b border-zinc-800 pb-2">
          SVG Logo Files
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Favicon */}
          <div className="space-y-2">
            <h3 className="text-sm text-zinc-500">Favicon (32x32)</h3>
            <div className="bg-zinc-900 p-4 rounded-lg inline-block">
              <Image src="/favicon.svg" alt="Favicon" width={32} height={32} />
            </div>
          </div>

          {/* Logo mark */}
          <div className="space-y-2">
            <h3 className="text-sm text-zinc-500">Logo + Wordmark (200x220)</h3>
            <div className="bg-zinc-900 p-4 rounded-lg inline-block">
              <Image src="/logo.svg" alt="Logo" width={200} height={220} />
            </div>
          </div>

          {/* Logo mark large */}
          <div className="space-y-2">
            <h3 className="text-sm text-zinc-500">Logo + Wordmark (400x440)</h3>
            <div className="bg-zinc-900 p-4 rounded-lg inline-block">
              <Image src="/logo.svg" alt="Logo Large" width={400} height={440} />
            </div>
          </div>
        </div>

        {/* OG Image */}
        <div className="space-y-2">
          <h3 className="text-sm text-zinc-500">OG Image (1200x630)</h3>
          <div className="bg-zinc-900 p-4 rounded-lg">
            <Image
              src="/og-image.svg"
              alt="OG Image"
              width={600}
              height={315}
              className="w-full max-w-2xl border border-zinc-800 rounded"
            />
          </div>
        </div>

        {/* Full size OG */}
        <div className="space-y-2">
          <h3 className="text-sm text-zinc-500">OG Image (Full Size)</h3>
          <div className="bg-zinc-900 p-4 rounded-lg overflow-x-auto">
            <Image
              src="/og-image.svg"
              alt="OG Image Full"
              width={1200}
              height={630}
              className="border border-zinc-800 rounded"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
