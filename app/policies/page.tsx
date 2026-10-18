import Link from "next/link";

export const metadata = {
  title: "Collector Guidelines & Operating Policies — Kala Setu",
  description: "Standard operating guidelines on artwork shipping, packaging recommendations, 7-day inspection windows, damage reporting, and order cancellations.",
};

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-black text-white px-5 md:px-16 py-12 md:py-20 selection:bg-yellow-500/30 selection:text-yellow-200">
      <div className="max-w-4xl mx-auto">
        {/* BREADCRUMB */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-400 flex items-center gap-2">
          <Link href="/" className="hover:text-yellow-400 transition">Home</Link>
          <span>/</span>
          <span className="text-yellow-400 font-medium">Marketplace Guidelines & Policies</span>
        </nav>

        {/* HEADER */}
        <div className="pb-8 mb-8 border-b border-yellow-600/20">
          <span className="text-yellow-500 text-xs uppercase tracking-widest font-semibold block mb-2">
            Marketplace Operational Guidelines
          </span>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-yellow-400 mb-4">
            Marketplace Policies & Standards
          </h1>
          <p className="text-neutral-300 text-sm md:text-base leading-relaxed mb-4">
            Kala Setu connects collectors directly with independent Indian artists. To foster trust and clarity between patron and creator, our platform operates according to transparent guidelines.
          </p>
          <div className="bg-neutral-900/90 border border-yellow-600/30 rounded-xl p-3.5 text-xs text-neutral-300">
            <span className="text-yellow-500 font-semibold mr-1.5">Notice:</span>
            The guidelines below represent Kala Setu&apos;s standard mediation practices and studio recommendations. Bespoke commissions are governed by individual written agreements between the collector and the artist.
          </div>
        </div>

        {/* POLICIES SECTIONS */}
        <div className="space-y-8">
          {/* SECTION 1: 7-DAY INSPECTION WINDOW */}
          <section className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-xl text-yellow-400 shrink-0">
                🔄
              </span>
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-white">
                  7-Day Collector Inspection Window
                </h2>
                <p className="text-xs text-yellow-500/80">Applicable to catalogued physical artworks</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed border-t border-yellow-600/15 pt-4">
              <p>
                Collectors have <strong className="text-white">7 calendar days</strong> from confirmed delivery to inspect the piece in person. If you wish to request a return:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-neutral-400">
                <li>
                  <strong className="text-neutral-200">Unaltered Condition:</strong> The artwork must remain in its original delivered condition with no modifications, frame removal, or surface alterations.
                </li>
                <li>
                  <strong className="text-neutral-200">Original Packaging:</strong> Artworks must be repacked using the original protective materials (corner shock guards, protective wrap, and outer shell) to prevent transit abrasion.
                </li>
                <li>
                  <strong className="text-neutral-200">Return Coordination:</strong> Return shipping is coordinated through trackable courier services. Upon verified receipt and inspection by the creator studio, refunds are credited back to the original payment source.
                </li>
                <li>
                  <strong className="text-neutral-200">Bespoke Commissions:</strong> Custom artworks commissioned to specific dimensions or individualized themes are non-returnable once creator execution begins, except in cases of verified transit damage.
                </li>
              </ul>
            </div>
          </section>

          {/* SECTION 2: TRANSIT DAMAGE PROTOCOL */}
          <section className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-xl text-yellow-400 shrink-0">
                🛡️
              </span>
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-white">
                  Transit Inspection & Damage Resolution
                </h2>
                <p className="text-xs text-yellow-500/80">Studio packaging guidelines and unboxing documentation</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed border-t border-yellow-600/15 pt-4">
              <p>
                Creators are required to use protective packaging suitable for fine art transport. In the event an item arrives with packaging breach or physical damage:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-neutral-400">
                <li>
                  <strong className="text-neutral-200">Document Immediately:</strong> Take clear photographs of the outer package, courier shipping label, and the specific damage on the artwork during unboxing.
                </li>
                <li>
                  <strong className="text-neutral-200">Notify Within 48 Hours:</strong> Submit your report via your <Link href="/account" className="text-yellow-400 underline">Collector Account</Link> or email concierge@kalasetu.art within 48 hours of delivery.
                </li>
                <li>
                  <strong className="text-neutral-200">Resolution Pathway:</strong> Kala Setu will mediate between the collector and the artist atelier to arrange return shipping and refund processing or studio touch-up where agreeable.
                </li>
              </ol>
            </div>
          </section>

          {/* SECTION 3: ORDER CANCELLATION */}
          <section className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-xl text-yellow-400 shrink-0">
                ⏱️
              </span>
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-white">
                  Order Cancellation Terms
                </h2>
                <p className="text-xs text-yellow-500/80">Cancellations prior to creator dispatch</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed border-t border-yellow-600/15 pt-4">
              <p>
                Catalogue orders may be cancelled with a full refund prior to studio dispatch (while status is marked as <em>Pending</em> or <em>Processing</em> in your account). Once the parcel is transferred to the courier and assigned a tracking identifier, the standard 7-day inspection process applies upon receipt.
              </p>
            </div>
          </section>

          {/* SECTION 4: ARTIST PROVENANCE & CREATOR DIRECT DISPATCH */}
          <section className="bg-neutral-900/80 border border-yellow-600/25 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-xl text-yellow-400 shrink-0">
                ✒️
              </span>
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-white">
                  Direct Studio Provenance
                </h2>
                <p className="text-xs text-yellow-500/80">Direct representation from independent Indian creators</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed border-t border-yellow-600/15 pt-4">
              <p>
                Kala Setu connects collectors directly with independent artists. Artworks are dispatched straight from the creator&apos;s studio location. Physical artworks indicate whether they are signed by the artist in the listing specifications. Kala Setu does not issue speculative third-party financial appraisal certificates.
              </p>
            </div>
          </section>
        </div>

        {/* SUPPORT CONCIERGE BANNER */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-yellow-600/40 text-center">
          <h3 className="font-display text-xl sm:text-2xl text-yellow-400 mb-2">
            Have Questions About an Order?
          </h3>
          <p className="text-neutral-300 text-xs sm:text-sm max-w-xl mx-auto mb-6">
            Our Collector Advisory team is available Monday through Saturday, 10:00 AM – 7:00 PM IST to assist with order tracking, artist communication, or custom inquiries.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold">
            <a
              href="mailto:concierge@kalasetu.art"
              className="bg-yellow-500 text-black px-6 py-2.5 rounded-lg hover:bg-yellow-400 transition"
            >
              Email Concierge Desk
            </a>
            <Link
              href="/account?tab=orders"
              className="border border-yellow-600/40 text-yellow-400 px-6 py-2.5 rounded-lg hover:bg-yellow-500/10 transition"
            >
              View Order Timeline
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
