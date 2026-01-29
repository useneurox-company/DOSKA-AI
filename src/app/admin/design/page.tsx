"use client";

import { useState } from "react";
import Link from "next/link";

export default function DesignPage() {
  const [logos, setLogos] = useState<string[]>([]);
  const [banners, setBanners] = useState<string[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<number | null>(null);
  const [selectedBanner, setSelectedBanner] = useState<number | null>(null);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Промпты для генерации
  const logoPrompts = [
    "Modern minimalist logo for 'Doska.AI' - AI marketplace platform for construction materials and metal. Blue and purple gradient, clean typography, tech feel, no background",
    "Abstract logo for 'Doska.AI' - digital board/bulletin concept with AI elements, modern tech startup style, gradient blue to violet, simple geometric shapes",
    "Logo design 'Doska.AI' - combination of document/list icon with AI neural network pattern, professional B2B style, blue purple colors, minimal",
    "Sleek logo for Doska AI platform - represents automated supplier matching, abstract data flow design, corporate blue and purple, modern sans-serif font",
    "Tech logo 'Doska.AI' - smart procurement platform, abstract D letter with digital dots, gradient indigo to purple, futuristic minimalist style",
  ];

  const bannerPrompts = [
    "Professional web banner for Doska.AI - AI-powered B2B marketplace for construction materials. Show abstract visualization of document analysis, blue-purple dark theme, modern tech aesthetic, text 'Upload your estimate - AI finds best prices'. Wide format 16:9",
    "Hero banner for procurement platform Doska.AI - illustrate AI analyzing spreadsheet/document, matching with suppliers, dark blue gradient background, glowing data connections, futuristic business style. 16:9 wide",
    "Marketing banner Doska.AI - B2B construction materials marketplace with AI. Abstract representation of smart matching: documents on left, suppliers on right, AI in center connecting them. Dark theme, blue purple accents, professional. Wide 16:9",
  ];

  const generateLogos = async () => {
    setLoadingLogos(true);
    setError(null);
    setLogos([]);

    try {
      const results: string[] = [];

      for (let i = 0; i < 5; i++) {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: logoPrompts[i],
            model: "recraft-v3-svg",
            count: 1,
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error(`Logo ${i + 1} error:`, data.error);
          continue;
        }

        if (data.images && data.images.length > 0) {
          results.push(data.images[0]);
          setLogos([...results]);
        }
      }

      if (results.length === 0) {
        setError("Не удалось сгенерировать логотипы");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setLoadingLogos(false);
    }
  };

  const generateBanners = async () => {
    setLoadingBanners(true);
    setError(null);
    setBanners([]);

    try {
      const results: string[] = [];

      for (let i = 0; i < 3; i++) {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: bannerPrompts[i],
            model: "nano-banana",
            count: 1,
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error(`Banner ${i + 1} error:`, data.error);
          continue;
        }

        if (data.images && data.images.length > 0) {
          results.push(data.images[0]);
          setBanners([...results]);
        }
      }

      if (results.length === 0) {
        setError("Не удалось сгенерировать баннеры");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setLoadingBanners(false);
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">Генератор дизайна</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Logos Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Логотипы</h2>
              <p className="text-gray-400 mt-1">5 вариантов через Recraft V3 SVG</p>
            </div>
            <button
              onClick={generateLogos}
              disabled={loadingLogos}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:from-blue-400 hover:to-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingLogos ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Генерация...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Сгенерировать логотипы
                </>
              )}
            </button>
          </div>

          {logos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {logos.map((url, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedLogo(index)}
                  className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all ${
                    selectedLogo === index
                      ? "ring-4 ring-green-500 scale-105"
                      : "ring-2 ring-white/10 hover:ring-white/30"
                  }`}
                >
                  <img src={url} alt={`Logo ${index + 1}`} className="w-full h-full object-contain bg-gray-900" />
                  {selectedLogo === index && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(url, `doska-logo-${index + 1}.svg`);
                      }}
                      className="flex-1 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg text-xs font-medium hover:bg-black/90 transition-colors"
                    >
                      Скачать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-square rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center">
                  <span className="text-gray-600">Логотип {i}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Banners Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Баннеры</h2>
              <p className="text-gray-400 mt-1">3 варианта через Google Nano-Banana-Pro</p>
            </div>
            <button
              onClick={generateBanners}
              disabled={loadingBanners}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:from-purple-400 hover:to-pink-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingBanners ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Генерация...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Сгенерировать баннеры
                </>
              )}
            </button>
          </div>

          {banners.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {banners.map((url, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedBanner(index)}
                  className={`relative aspect-[16/9] max-h-[400px] rounded-2xl overflow-hidden cursor-pointer transition-all ${
                    selectedBanner === index
                      ? "ring-4 ring-green-500"
                      : "ring-2 ring-white/10 hover:ring-white/30"
                  }`}
                >
                  <img src={url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                  {selectedBanner === index && (
                    <div className="absolute top-4 right-4 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(url, `doska-banner-${index + 1}.png`);
                      }}
                      className="px-4 py-2 bg-black/70 backdrop-blur-sm rounded-xl text-sm font-medium hover:bg-black/90 transition-colors"
                    >
                      Скачать баннер
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[16/9] max-h-[300px] rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center">
                  <span className="text-gray-600">Баннер {i}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Selection Summary */}
        {(selectedLogo !== null || selectedBanner !== null) && (
          <section className="p-6 bg-gray-900 rounded-2xl border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Выбрано:</h3>
            <div className="flex flex-wrap gap-4">
              {selectedLogo !== null && (
                <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Логотип #{selectedLogo + 1}</span>
                </div>
              )}
              {selectedBanner !== null && (
                <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Баннер #{selectedBanner + 1}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
