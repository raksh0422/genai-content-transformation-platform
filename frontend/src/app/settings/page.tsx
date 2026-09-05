"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your workspace preferences.
        </p>
      </div>

      {/* Supported File Types */}
      <section className="surface-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Supported file types</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { ext: "PDF", desc: "Portable Document Format" },
            { ext: "DOCX", desc: "Microsoft Word" },
            { ext: "PPTX", desc: "Microsoft PowerPoint" },
            { ext: "TXT", desc: "Plain text" },
          ].map((f) => (
            <div key={f.ext} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm font-semibold text-gray-900">{f.ext}</p>
              <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">Maximum file size: 50 MB per document.</p>
      </section>

      {/* Available Transformations */}
      <section className="surface-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Available content types</h2>
        <div className="space-y-2">
          {[
            { name: "Executive Summary", desc: "A structured briefing with key insights and conclusions" },
            { name: "Short Summary", desc: "A concise 1-2 paragraph overview of the document" },
            { name: "FAQ", desc: "Questions and answers derived from the document" },
            { name: "Quiz", desc: "Multiple choice questions for knowledge testing" },
            { name: "Email", desc: "A professional email draft based on the document" },
            { name: "Social Post", desc: "A LinkedIn or Twitter-ready post" },
            { name: "Presentation Outline", desc: "A structured slide-by-slide outline" },
          ].map((t) => (
            <div key={t.name} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Workspace */}
      <section className="surface-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Your workspace</h2>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-800 text-white flex items-center justify-center font-semibold shrink-0">
            S
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Sachin</p>
            <p className="text-xs text-gray-400">Personal workspace</p>
          </div>
        </div>
      </section>
    </div>
  );
}
