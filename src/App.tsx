import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { AuthProvider } from './contexts/AuthContext';
import {
  BASELINE_INDIAN_STATIONS,
  NATIONAL_ALERTS,
  type PortalLang,
  type PortalTab,
  type StationTelemetry,
} from './data/indiaStations';
import { TopPortalHeader } from './components/breathe/TopPortalHeader';
import { OverviewDashboard } from './components/breathe/OverviewDashboard';
import { IndiaMapView } from './components/breathe/IndiaMapView';
import {
  CityComparisonView,
  FindCleanerPlacesView,
} from './components/breathe/ComparisonAndCleanerViews';
import {
  AiAirExplainerView,
  HealthSafetyCentreView,
} from './components/breathe/ExplainerAndHealthViews';
import {
  ForecastsTrendsView,
  PowerBiAnalyticsView,
} from './components/breathe/ForecastsAndAnalyticsViews';

function BreatheIndiaApp() {
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [lang, setLang] = useState<PortalLang>('en');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [stations, setStations] = useState<StationTelemetry[]>(
    BASELINE_INDIAN_STATIONS
  );
  const [focusedStation, setFocusedStation] = useState<StationTelemetry>(
    BASELINE_INDIAN_STATIONS[0]
  );
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState('Live CPCB baseline');
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // Listen for Case A Google Maps Quota events
  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Hydrate live Open-Meteo atmospheric & CPCB NAQI telemetry on mount
  useEffect(() => {
    let active = true;
    const points = BASELINE_INDIAN_STATIONS.map((s) => ({
      code: s.code,
      lat: s.lat,
      lng: s.lng,
    }));
    fetch('/api/air-quality/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.stations) || data.stations.length === 0) {
          return;
        }
        const byCode: Record<string, Record<string, unknown>> = {};
        for (const row of data.stations) {
          if (row && typeof row.code === 'string') {
            byCode[row.code] = row;
          }
        }
        setStations((prev) =>
          prev.map((st) => {
            const live = byCode[st.code];
            if (!live) return st;
            return {
              ...st,
              aqi: typeof live.aqi === 'number' ? live.aqi : st.aqi,
              pm25: typeof live.pm25 === 'number' ? live.pm25 : st.pm25,
              pm10: typeof live.pm10 === 'number' ? live.pm10 : st.pm10,
              no2: typeof live.no2 === 'number' ? live.no2 : st.no2,
              so2: typeof live.so2 === 'number' ? live.so2 : st.so2,
              co: typeof live.co === 'number' ? live.co : st.co,
              o3: typeof live.o3 === 'number' ? live.o3 : st.o3,
              windKmh: typeof live.windKmh === 'number' ? live.windKmh : st.windKmh,
              tempC: typeof live.tempC === 'number' ? live.tempC : st.tempC,
              humidityPct:
                typeof live.humidityPct === 'number' ? live.humidityPct : st.humidityPct,
              hourlyPm25: Array.isArray(live.hourlyPm25)
                ? (live.hourlyPm25 as number[])
                : st.hourlyPm25,
              hourlyPm10: Array.isArray(live.hourlyPm10)
                ? (live.hourlyPm10 as number[])
                : st.hourlyPm10,
              updatedMinutesAgo: 1,
              source: 'live-telemetry',
            };
          })
        );
        setLastSyncedLabel('Updated just now');
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const handleInspectOnMap = (st: StationTelemetry) => {
    setFocusedStation(st);
    setActiveTab('map');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] text-[#0b1c30]">
      <TopPortalHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lang={lang}
        onToggleLang={setLang}
        stations={stations}
        selectedCityCode={focusedStation.code}
        onSelectStation={(st) => {
          setFocusedStation(st);
          setActiveTab('map');
        }}
        alertCount={NATIONAL_ALERTS.length}
        onOpenAlerts={() => setAlertsOpen(true)}
        lastSyncedLabel={lastSyncedLabel}
        mapsQuotaExceeded={mapsQuotaExceeded}
        onDismissQuotaBanner={() => setMapsQuotaExceeded(false)}
      />

      {/* Alerts Slide-Over Drawer */}
      {alertsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end no-print">
          <div
            className="fixed inset-0 bg-[#0b1c30]/40"
            onClick={() => setAlertsOpen(false)}
          />
          <aside className="relative z-10 w-full max-w-md bg-white h-full shadow-xl border-l border-[#bdc9c1] flex flex-col">
            <div className="px-5 py-4 border-b border-[#bdc9c1]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#ba1a1a]" />
                <h2 className="text-base font-bold text-[#0b1c30]">
                  {lang === 'hi' ? 'सक्रिय वायु आपातकालीन अलर्ट' : 'Active National Air Alerts'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAlertsOpen(false)}
                className="p-1.5 text-[#6e7a73] hover:text-[#0b1c30]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {NATIONAL_ALERTS.map((al) => (
                <div
                  key={al.id}
                  className="p-4 rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/30 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#0b1c30]">{al.city}</span>
                    <span className="px-2 py-0.5 rounded bg-[#ba1a1a] text-white text-[10px] font-bold tabular-nums">
                      AQI {al.aqi} · {al.grapStage}
                    </span>
                  </div>
                  <p className="text-xs text-[#3e4943] leading-relaxed">
                    {lang === 'hi' ? al.advisoryHi : al.advisory}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 w-full">
        {activeTab === 'overview' && (
          <OverviewDashboard
            stations={stations}
            selectedState={selectedState}
            onChangeState={setSelectedState}
            lang={lang}
            onNavigate={setActiveTab}
            onInspectStationOnMap={handleInspectOnMap}
          />
        )}
        {activeTab === 'map' && (
          <IndiaMapView
            stations={stations}
            focusedStation={focusedStation}
            onSelectStation={setFocusedStation}
            lang={lang}
          />
        )}
        {activeTab === 'compare' && (
          <CityComparisonView stations={stations} lang={lang} />
        )}
        {activeTab === 'cleaner' && (
          <FindCleanerPlacesView
            stations={stations}
            lang={lang}
            onInspectOnMap={handleInspectOnMap}
          />
        )}
        {activeTab === 'explainer' && (
          <AiAirExplainerView
            stations={stations}
            selectedStation={focusedStation}
            lang={lang}
          />
        )}
        {activeTab === 'health' && (
          <HealthSafetyCentreView stations={stations} lang={lang} />
        )}
        {activeTab === 'forecasts' && (
          <ForecastsTrendsView stations={stations} lang={lang} />
        )}
        {activeTab === 'analytics' && (
          <PowerBiAnalyticsView stations={stations} lang={lang} />
        )}
      </main>

      {/* Institutional Portal Footer */}
      <footer className="w-full bg-[#eff4ff] text-[#0b1c30] border-t border-[#bdc9c1]/40 mt-8 no-print">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-[#bdc9c1]/40">
            <div className="md:col-span-2 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#005d42]">Breathe India</span>
                <span className="text-[10px] bg-[#dce9ff] text-[#0b1c30] px-1.5 py-0.5 rounded font-semibold">
                  NATIONAL ENVIRONMENTAL PORTAL
                </span>
              </div>
              <p className="text-xs text-[#3e4943] leading-relaxed max-w-xl">
                National Environmental Air Intelligence Portal aligned with CPCB, SAFAR India, IMD, and Ministry of Environment guidelines. Empowers citizens, researchers, and municipal teams with verified dispersion telemetry.
              </p>
              <div className="flex flex-wrap items-center gap-5 pt-1 text-xs font-semibold tabular-nums">
                <div>
                  <span className="text-[#3e4943] font-normal">National Helpline: </span>
                  <span className="text-[#005d42] font-bold">1800-11-CPCB</span>
                </div>
                <div>
                  <span className="text-[#3e4943] font-normal">Emergency Asthma Hotline: </span>
                  <span className="text-[#ba1a1a] font-bold">108</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-[11px] mb-1">
                Portals & Registry
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="text-left text-[#3e4943] hover:text-[#005d42]"
              >
                CAAQMS Station Registry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('compare')}
                className="text-left text-[#3e4943] hover:text-[#005d42]"
              >
                City Comparison Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className="text-left text-[#3e4943] hover:text-[#005d42]"
              >
                Power BI Analytics Suite
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cleaner')}
                className="text-left text-[#3e4943] hover:text-[#005d42]"
              >
                Clean Air Escapes
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-[11px] mb-1">
                Intelligence & Safety
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className="text-left text-[#3e4943] hover:text-[#005d42]"
              >
                Interactive India Map
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('explainer')}
                className="text-left text-[#3e4943] hover:text-[#005d42]"
              >
                AI Air Explainer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('health')}
                className="text-left text-[#3e4943] hover:text-[#005d42]"
              >
                Health & GRAP Guidelines
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forecasts')}
                className="text-left text-[#3e4943] hover:text-[#005d42]"
              >
                7-Day Dispersion Forecasts
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#3e4943]">
            <p>
              Data sourced from CPCB, SAFAR India, IMD & live atmospheric telemetry. For clinical advice, consult qualified medical specialists.
            </p>
            <p className="shrink-0 font-semibold">
              Breathe India · CPCB & SAFAR Aligned
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BreatheIndiaApp />
    </AuthProvider>
  );
}
