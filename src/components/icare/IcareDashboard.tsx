import { useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Bed,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  HeartPulse,
  Hospital,
  MapPin,
  MessageCircle,
  Minus,
  Pill,
  Plus,
  RadioTower,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

type Risk = "safe" | "warning" | "critical";
type AmbulanceStatus = "Available" | "Busy" | "En Route";
type Medicine = { id: number; name: string; category: string; quantity: number; threshold: number; expiry: string; usage: number[] };
type AmbulanceUnit = { id: string; driver: string; status: AmbulanceStatus; location: string; eta: number; performance: number };
type HospitalRecord = {
  id: number;
  name: string;
  state: string;
  city: string;
  beds: number;
  icu: number;
  occupancy: number;
  icuOccupancy: number;
  doctors: number;
  nurses: number;
  ambulances: AmbulanceUnit[];
  medicines: Medicine[];
};

const initialHospitals: HospitalRecord[] = [
  {
    id: 1,
    name: "AIIMS Nagpur",
    state: "Maharashtra",
    city: "Nagpur",
    beds: 820,
    icu: 92,
    occupancy: 78,
    icuOccupancy: 84,
    doctors: 212,
    nurses: 488,
    ambulances: [
      { id: "MH31-A11", driver: "R. Deshmukh", status: "Available", location: "Wardha Road", eta: 7, performance: 94 },
      { id: "MH31-A18", driver: "S. Khan", status: "Busy", location: "Sitabuldi", eta: 18, performance: 89 },
      { id: "MH31-A22", driver: "M. Patel", status: "Available", location: "Mihan", eta: 11, performance: 91 },
    ],
    medicines: [
      { id: 1, name: "Ceftriaxone", category: "Antibiotic", quantity: 138, threshold: 180, expiry: "2026-05-18", usage: [30, 42, 38, 48, 54, 61, 66] },
      { id: 2, name: "Insulin", category: "Endocrine", quantity: 310, threshold: 140, expiry: "2026-08-04", usage: [21, 24, 26, 27, 31, 33, 35] },
      { id: 3, name: "Adrenaline", category: "Emergency", quantity: 62, threshold: 80, expiry: "2026-03-11", usage: [8, 10, 12, 11, 13, 15, 18] },
    ],
  },
  {
    id: 2,
    name: "AIIMS Delhi",
    state: "Delhi",
    city: "New Delhi",
    beds: 2478,
    icu: 312,
    occupancy: 91,
    icuOccupancy: 93,
    doctors: 780,
    nurses: 1680,
    ambulances: [
      { id: "DL01-D07", driver: "A. Mehra", status: "En Route", location: "Ring Road", eta: 9, performance: 96 },
      { id: "DL01-D14", driver: "K. Singh", status: "Available", location: "Safdarjung", eta: 5, performance: 92 },
    ],
    medicines: [
      { id: 1, name: "Meropenem", category: "Antibiotic", quantity: 92, threshold: 160, expiry: "2026-04-24", usage: [36, 38, 44, 49, 55, 63, 70] },
      { id: 2, name: "Dopamine", category: "Critical Care", quantity: 48, threshold: 70, expiry: "2026-02-28", usage: [12, 13, 12, 16, 18, 21, 24] },
    ],
  },
  {
    id: 3,
    name: "Fortis Hospital Mumbai",
    state: "Maharashtra",
    city: "Mumbai",
    beds: 620,
    icu: 76,
    occupancy: 72,
    icuOccupancy: 69,
    doctors: 188,
    nurses: 360,
    ambulances: [
      { id: "MH02-F09", driver: "P. Nair", status: "Available", location: "Mulund", eta: 6, performance: 95 },
      { id: "MH02-F16", driver: "J. Fernandes", status: "Busy", location: "Thane", eta: 14, performance: 87 },
    ],
    medicines: [
      { id: 1, name: "Paracetamol IV", category: "Analgesic", quantity: 540, threshold: 220, expiry: "2026-09-08", usage: [48, 50, 53, 56, 58, 59, 62] },
      { id: 2, name: "Piperacillin", category: "Antibiotic", quantity: 118, threshold: 150, expiry: "2026-06-02", usage: [22, 29, 31, 36, 39, 44, 49] },
    ],
  },
  {
    id: 4,
    name: "Apollo Hospitals Chennai",
    state: "Tamil Nadu",
    city: "Chennai",
    beds: 700,
    icu: 88,
    occupancy: 66,
    icuOccupancy: 71,
    doctors: 245,
    nurses: 520,
    ambulances: [
      { id: "TN09-C04", driver: "V. Kumar", status: "Available", location: "Greams Road", eta: 4, performance: 97 },
      { id: "TN09-C11", driver: "N. Ravi", status: "Available", location: "Nungambakkam", eta: 8, performance: 93 },
    ],
    medicines: [
      { id: 1, name: "Oseltamivir", category: "Antiviral", quantity: 126, threshold: 100, expiry: "2026-07-17", usage: [12, 16, 19, 24, 31, 37, 45] },
      { id: 2, name: "Salbutamol", category: "Respiratory", quantity: 78, threshold: 120, expiry: "2026-03-30", usage: [18, 21, 25, 28, 34, 39, 43] },
    ],
  },
];

const riskClass: Record<Risk, string> = {
  safe: "bg-safe text-safe-foreground",
  warning: "bg-warning text-warning-foreground",
  critical: "bg-critical text-critical-foreground",
};

const getRisk = (value: number): Risk => (value >= 88 ? "critical" : value >= 74 ? "warning" : "safe");
const titleCase = (risk: Risk) => risk.charAt(0).toUpperCase() + risk.slice(1);

function Panel({ title, icon: Icon, children, action }: { title: string; icon: typeof Activity; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm animate-soft-enter">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-secondary p-2 text-primary"><Icon className="h-4 w-4" /></span>
          <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, risk, icon: Icon }: { label: string; value: string; risk: Risk; icon: typeof Activity }) {
  return (
    <div className="rounded-lg border border-panel-foreground/10 bg-panel-foreground/8 p-3 text-panel-foreground">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-panel-foreground/75">
        <span>{label}</span><Icon className="h-4 w-4" />
      </div>
      <div className="flex items-end justify-between gap-2">
        <strong className="text-2xl leading-none">{value}</strong>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${riskClass[risk]}`}>{titleCase(risk)}</span>
      </div>
    </div>
  );
}

function FloatingCopilot({ hospital, alerts, dispatchAmbulance }: { hospital: HospitalRecord; alerts: string[]; dispatchAmbulance: () => void }) {
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 120 });
  const [messages, setMessages] = useState([
    { from: "ai", text: "ICU capacity may exceed 90% in 4 hours if current inflow continues." },
    { from: "ai", text: "Antibiotic stock requires review before the evening shift." },
  ]);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const onSend = (text: string) => {
    setMessages((items) => [
      ...items,
      { from: "user", text },
      { from: "ai", text: `${hospital.name}: ${alerts[0] || "operations are stable"}. Recommended action: activate surge staff and keep one ambulance on standby.` },
    ]);
  };

  return (
    <div
      className="fixed z-50 w-[min(92vw,360px)] rounded-lg border border-primary/20 bg-card shadow-2xl reduced-motion-safe"
      style={{ left: position.x, top: position.y }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        setPosition({ x: Math.max(8, event.clientX - drag.current.dx), y: Math.max(8, event.clientY - drag.current.dy) });
      }}
      onPointerUp={() => (drag.current = null)}
    >
      <div
        className="flex cursor-grab items-center justify-between gap-2 rounded-t-lg bg-primary p-3 text-primary-foreground"
        onPointerDown={(event) => {
          const rect = event.currentTarget.parentElement?.getBoundingClientRect();
          drag.current = { dx: event.clientX - (rect?.left || 0), dy: event.clientY - (rect?.top || 0) };
        }}
      >
        <div className="flex items-center gap-2"><Bot className="h-5 w-5 animate-float-pulse" /><span className="font-semibold">Icare Co-pilot</span></div>
        <div className="flex gap-1">
          <button aria-label="Minimize assistant" className="rounded-md p-1 hover:bg-primary-foreground/15" onClick={() => setMinimized((v) => !v)}><Minus className="h-4 w-4" /></button>
          <button aria-label="Close assistant" className="rounded-md p-1 hover:bg-primary-foreground/15" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
        </div>
      </div>
      {open && !minimized && (
        <div className="space-y-3 p-3">
          <div className="max-h-52 space-y-2 overflow-auto pr-1">
            {messages.map((message, index) => (
              <div key={`${message.text}-${index}`} className={`rounded-lg p-2 text-sm ${message.from === "ai" ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground"}`}>{message.text}</div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="clinical" size="sm" onClick={() => onSend("What needs action now?")}><Sparkles className="h-4 w-4" />Ask</Button>
            <Button variant="emergency" size="sm" onClick={dispatchAmbulance}><Ambulance className="h-4 w-4" />Dispatch</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IcareDashboard() {
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [selectedId, setSelectedId] = useState(1);
  const [emergency, setEmergency] = useState(false);
  const [activeTab, setActiveTab] = useState<"ops" | "admin">("ops");
  const [scenario, setScenario] = useState({ beds: 0, staff: 0, diverted: 0 });
  const [newMed, setNewMed] = useState({ name: "", quantity: 0, threshold: 50, category: "General", expiry: "2026-12-31" });
  const [newHospital, setNewHospital] = useState({ name: "", state: "Karnataka", city: "Bengaluru", beds: 400, icu: 48, staff: 260 });
  const [eventLog, setEventLog] = useState<string[]>(["AI watchtower active across selected region", "Morning shift validated 18 minutes ago"]);

  const hospital = hospitals.find((item) => item.id === selectedId) || hospitals[0];
  const states = [...new Set(hospitals.map((item) => item.state))];
  const cities = [...new Set(hospitals.filter((item) => item.state === hospital.state).map((item) => item.city))];
  const staffAvailability = Math.max(42, Math.round(100 - hospital.occupancy * 0.42 + scenario.staff * 0.18));
  const adjustedOccupancy = Math.max(20, Math.round(hospital.occupancy - scenario.beds * 0.12 - scenario.diverted * 0.22));
  const adjustedIcu = Math.max(20, Math.round(hospital.icuOccupancy - scenario.beds * 0.05 - scenario.diverted * 0.14));
  const lowStock = hospital.medicines.filter((medicine) => medicine.quantity <= medicine.threshold);
  const expiring = hospital.medicines.filter((medicine) => new Date(medicine.expiry).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 90);
  const edPressure = Math.round((adjustedOccupancy + adjustedIcu + (100 - staffAvailability)) / 3);
  const alerts = [
    ...(adjustedIcu > 88 ? [`ICU pressure at ${adjustedIcu}% may cross critical threshold`] : []),
    ...(lowStock.length ? [`${lowStock[0].name} stock is below threshold`] : []),
    ...(expiring.length ? [`${expiring[0].name} expires within 90 days`] : []),
    ...(emergency ? ["Emergency mode is active: dispatch priority elevated"] : []),
    ...eventLog.slice(0, 2),
  ];

  const forecastData = useMemo(() => [
    { hour: "6h", patients: Math.round(38 + hospital.occupancy * 0.42 - scenario.diverted), confidence: 94 },
    { hour: "12h", patients: Math.round(74 + hospital.occupancy * 0.64 - scenario.diverted * 1.8), confidence: 89 },
    { hour: "24h", patients: Math.round(148 + hospital.occupancy * 1.05 - scenario.diverted * 2.4), confidence: 84 },
  ], [hospital.occupancy, scenario.diverted]);

  const usageData = [
    { name: "Beds", value: adjustedOccupancy },
    { name: "ICU", value: adjustedIcu },
    { name: "Staff", value: 100 - staffAvailability },
  ];
  const severity = [
    { name: "Critical", value: Math.max(10, Math.round(adjustedIcu * 0.28)) },
    { name: "Moderate", value: Math.max(25, Math.round(adjustedOccupancy * 0.44)) },
    { name: "Mild", value: Math.max(30, 100 - Math.round(adjustedIcu * 0.28) - Math.round(adjustedOccupancy * 0.44)) },
  ];

  const updateHospital = (updater: (record: HospitalRecord) => HospitalRecord) => {
    setHospitals((items) => items.map((item) => (item.id === hospital.id ? updater(item) : item)));
  };

  const dispatchAmbulance = () => {
    const candidate = hospital.ambulances.filter((item) => item.status === "Available").sort((a, b) => a.eta - b.eta)[0];
    if (!candidate) {
      setEventLog((items) => [`No ambulance available at ${hospital.name}; redirect request sent to nearby network`, ...items]);
      return;
    }
    updateHospital((record) => ({
      ...record,
      ambulances: record.ambulances.map((item) => item.id === candidate.id ? { ...item, status: "En Route", location: "Emergency pickup corridor", eta: Math.max(3, item.eta - 2) } : item),
    }));
    setEventLog((items) => [`${candidate.id} dispatched from ${candidate.location}; ETA ${candidate.eta} min`, ...items]);
  };

  const addMedicine = () => {
    if (!newMed.name.trim()) return;
    updateHospital((record) => ({
      ...record,
      medicines: [...record.medicines, { id: Date.now(), ...newMed, usage: [6, 8, 9, 11, 12, 13, 15] }],
    }));
    setNewMed({ name: "", quantity: 0, threshold: 50, category: "General", expiry: "2026-12-31" });
  };

  const deleteMedicine = (id: number) => updateHospital((record) => ({ ...record, medicines: record.medicines.filter((medicine) => medicine.id !== id) }));

  const addHospital = () => {
    if (!newHospital.name.trim()) return;
    setHospitals((items) => [...items, {
      id: Date.now(),
      name: newHospital.name,
      state: newHospital.state,
      city: newHospital.city,
      beds: newHospital.beds,
      icu: newHospital.icu,
      occupancy: 61,
      icuOccupancy: 58,
      doctors: Math.round(newHospital.staff * 0.32),
      nurses: Math.round(newHospital.staff * 0.68),
      ambulances: [{ id: `${newHospital.city.slice(0, 2).toUpperCase()}-NEW-1`, driver: "Unassigned", status: "Available", location: "Main gate", eta: 10, performance: 80 }],
      medicines: [],
    }]);
    setEventLog((items) => [`${newHospital.name} added to command network`, ...items]);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("Icare Hospital Operations Snapshot", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.text(`${hospital.name}, ${hospital.city}, ${hospital.state}`, 14, 28);
    const rows = [
      `Bed occupancy: ${adjustedOccupancy}%`,
      `ICU occupancy: ${adjustedIcu}%`,
      `ED pressure: ${edPressure}%`,
      `Staff availability: ${staffAvailability}%`,
      `Forecast 24h: ${forecastData[2].patients} admissions (${forecastData[2].confidence}% confidence)`,
      `Low stock medicines: ${lowStock.map((m) => m.name).join(", ") || "None"}`,
      `Top recommendation: ${adjustedIcu > 88 ? "Activate ICU surge and divert stable patients" : "Maintain standby staffing"}`,
    ];
    rows.forEach((row, index) => doc.text(row, 14, 42 + index * 9));
    doc.save(`icare-${hospital.name.replace(/\s+/g, "-").toLowerCase()}-snapshot.pdf`);
  };

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ hospital: hospital.name, adjustedOccupancy, adjustedIcu, edPressure, staffAvailability }]), "KPIs");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(forecastData), "Predictions");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hospital.medicines), "Medicine Inventory");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(hospital.ambulances), "Ambulances");
    XLSX.writeFile(workbook, `icare-${hospital.name.replace(/\s+/g, "-").toLowerCase()}-snapshot.xlsx`);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="medical-grid w-full border-b border-border bg-panel p-4 text-panel-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-primary-foreground/10 p-3"><HeartPulse className="h-7 w-7 text-accent" /></div>
            <div><h1 className="text-2xl font-bold">Icare</h1><p className="text-sm text-panel-foreground/70">Emergency intelligence for India</p></div>
          </div>
          <div className="space-y-3 rounded-lg border border-panel-foreground/10 bg-panel-foreground/8 p-3">
            <label className="text-xs font-semibold uppercase text-panel-foreground/65">Location Selector</label>
            <select className="w-full rounded-md border border-panel-foreground/15 bg-panel p-2 text-sm" value={hospital.state} onChange={(e) => setSelectedId(hospitals.find((item) => item.state === e.target.value)?.id || selectedId)}>{states.map((state) => <option key={state}>{state}</option>)}</select>
            <select className="w-full rounded-md border border-panel-foreground/15 bg-panel p-2 text-sm" value={hospital.city} onChange={(e) => setSelectedId(hospitals.find((item) => item.city === e.target.value)?.id || selectedId)}>{cities.map((city) => <option key={city}>{city}</option>)}</select>
            <select className="w-full rounded-md border border-panel-foreground/15 bg-panel p-2 text-sm" value={selectedId} onChange={(e) => setSelectedId(Number(e.target.value))}>{hospitals.filter((item) => item.city === hospital.city).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Kpi label="Bed Occupancy" value={`${adjustedOccupancy}%`} risk={getRisk(adjustedOccupancy)} icon={Bed} />
            <Kpi label="ICU Occupancy" value={`${adjustedIcu}%`} risk={getRisk(adjustedIcu)} icon={HeartPulse} />
            <Kpi label="ED Pressure" value={`${edPressure}%`} risk={getRisk(edPressure)} icon={ShieldAlert} />
            <Kpi label="Staff Available" value={`${staffAvailability}%`} risk={staffAvailability < 55 ? "critical" : staffAvailability < 70 ? "warning" : "safe"} icon={Users} />
          </div>
          <div className="mt-4 rounded-lg border border-panel-foreground/10 bg-panel-foreground/8 p-3">
            <div className="mb-2 flex items-center justify-between"><strong>Critical alerts</strong><span className="rounded-full bg-critical px-2 py-1 text-xs text-critical-foreground">{alerts.length}</span></div>
            <div className="space-y-2">{alerts.slice(0, 4).map((alert, index) => <p key={`${alert}-${index}`} className="rounded-md bg-panel p-2 text-xs text-panel-foreground/85">{alert}</p>)}</div>
          </div>
          <div className="mt-4 grid gap-2">
            <Button variant={emergency ? "emergency" : "clinical"} onClick={() => setEmergency((v) => !v)}><RadioTower className="h-4 w-4" />{emergency ? "Emergency Active" : "Enable Emergency"}</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="export" onClick={exportPdf}><Download className="h-4 w-4" />PDF</Button>
              <Button variant="export" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
            </div>
          </div>
        </aside>

        <section className="flex-1 lg:ml-80">
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 p-4 backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><p className="text-sm text-muted-foreground">Live command center</p><h2 className="text-2xl font-bold text-foreground">{hospital.name}</h2></div>
              <div className="flex gap-2">
                <Button variant={activeTab === "ops" ? "clinical" : "export"} onClick={() => setActiveTab("ops")}><Activity className="h-4 w-4" />Operations</Button>
                <Button variant={activeTab === "admin" ? "clinical" : "export"} onClick={() => setActiveTab("admin")}><Building2 className="h-4 w-4" />Admin Portal</Button>
              </div>
            </div>
          </header>

          {activeTab === "ops" ? (
            <div className="grid gap-4 p-4 xl:grid-cols-3">
              <Panel title="AI Forecasting Engine" icon={Activity}>
                <div className="h-64"><ResponsiveContainer><AreaChart data={forecastData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Area type="monotone" dataKey="patients" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.22)" /><Area type="monotone" dataKey="confidence" stroke="hsl(var(--safe))" fill="hsl(var(--safe) / 0.14)" /></AreaChart></ResponsiveContainer></div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">{forecastData.map((item) => <div key={item.hour} className="rounded-md bg-secondary p-2"><strong>{item.patients}</strong><p className="text-muted-foreground">{item.hour} · {item.confidence}%</p></div>)}</div>
              </Panel>
              <Panel title="Resource Optimization" icon={Bed}>
                <div className="h-64"><ResponsiveContainer><BarChart data={usageData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div>
                <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">Expected impact: +{scenario.beds} beds and +{scenario.staff} staff reduce ED pressure to {edPressure}%.</p>
              </Panel>
              <Panel title="Insights & Severity" icon={Sparkles}>
                <div className="h-48"><ResponsiveContainer><PieChart><Pie data={severity} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>{severity.map((_, index) => <Cell key={index} fill={["hsl(var(--critical))", "hsl(var(--warning))", "hsl(var(--safe))"][index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                <div className="space-y-2 text-sm">
                  <p className="rounded-md bg-secondary p-2">{adjustedIcu > 88 ? "Activate surge ICU and divert moderate cases." : "Keep current triage route and standby beds."}</p>
                  <p className="rounded-md bg-secondary p-2">Redistribute {Math.max(8, Math.round((100 - staffAvailability) / 2))} nurses to emergency intake.</p>
                </div>
              </Panel>
              <Panel title="Medicine Storage & Analysis" icon={Pill}>
                <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-md bg-secondary p-2"><strong>{hospital.medicines.reduce((sum, med) => sum + med.quantity, 0)}</strong><p>Total stock</p></div><div className="rounded-md bg-warning p-2 text-warning-foreground"><strong>{lowStock.length}</strong><p>Low stock</p></div><div className="rounded-md bg-critical p-2 text-critical-foreground"><strong>{expiring.length}</strong><p>Expiry</p></div></div>
                <div className="space-y-2">{hospital.medicines.map((medicine) => <div key={medicine.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm"><div><strong>{medicine.name}</strong><p className="text-muted-foreground">{medicine.category} · Qty {medicine.quantity} · Exp {medicine.expiry}</p></div><button aria-label={`Delete ${medicine.name}`} onClick={() => deleteMedicine(medicine.id)} className="rounded-md p-2 text-critical hover:bg-secondary"><X className="h-4 w-4" /></button></div>)}</div>
              </Panel>
              <Panel title="Ambulance Intelligence" icon={Ambulance} action={<Button variant="emergency" size="sm" onClick={dispatchAmbulance}><Ambulance className="h-4 w-4" />Dispatch nearest</Button>}>
                <div className="space-y-2">{hospital.ambulances.map((unit) => <div key={unit.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><div><strong>{unit.id}</strong><p className="text-muted-foreground">{unit.driver} · {unit.location}</p></div><div className="text-right"><span className={`rounded-full px-2 py-1 text-xs ${unit.status === "Available" ? riskClass.safe : unit.status === "En Route" ? riskClass.warning : riskClass.critical}`}>{unit.status}</span><p className="mt-1 text-muted-foreground">ETA {unit.eta}m</p></div></div>)}</div>
              </Panel>
              <Panel title="Real-time Alerts" icon={AlertTriangle}>
                <div className="space-y-2">{alerts.map((alert, index) => <div key={`${alert}-${index}`} className="flex gap-3 rounded-md border border-border p-3 text-sm"><AlertTriangle className={`mt-0.5 h-4 w-4 ${index < 2 ? "text-critical" : "text-warning"}`} /><div><strong>{index < 2 ? "High urgency" : "Watch"}</strong><p className="text-muted-foreground">{alert}</p></div></div>)}</div>
              </Panel>
              <Panel title="Scenario Simulation" icon={ChevronDown}>
                <div className="space-y-4">
                  {["beds", "staff", "diverted"].map((key) => <label key={key} className="block text-sm capitalize"><span className="mb-1 flex justify-between"><strong>{key === "diverted" ? "Divert patients" : `Add ${key}`}</strong><span>{scenario[key as keyof typeof scenario]}</span></span><input className="w-full accent-primary" type="range" min="0" max={key === "diverted" ? 80 : 120} value={scenario[key as keyof typeof scenario]} onChange={(e) => setScenario((s) => ({ ...s, [key]: Number(e.target.value) }))} /></label>)}
                  <p className="rounded-md bg-safe p-3 text-sm text-safe-foreground">Projection updated instantly: ICU {adjustedIcu}%, Beds {adjustedOccupancy}%, ED {edPressure}%.</p>
                </div>
              </Panel>
              <Panel title="Multi-Hospital Load Balancing" icon={Hospital}>
                <div className="space-y-2">{hospitals.filter((item) => item.id !== hospital.id).map((item) => <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><div><strong>{item.name}</strong><p className="text-muted-foreground">{item.city}, {item.state}</p></div><div className="text-right"><span className={`rounded-full px-2 py-1 text-xs ${riskClass[getRisk(item.occupancy)]}`}>{100 - item.occupancy}% free</span><p className="mt-1 text-muted-foreground">AI: {item.occupancy < hospital.occupancy ? "route stable cases" : "standby"}</p></div></div>)}</div>
              </Panel>
            </div>
          ) : (
            <div className="grid gap-4 p-4 xl:grid-cols-3">
              <Panel title="Admin Overview" icon={Building2}><div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-md bg-secondary p-3"><strong>{hospitals.length}</strong><p>Total hospitals</p></div><div className="rounded-md bg-secondary p-3"><strong>{Math.round(hospitals.reduce((s, h) => s + h.occupancy, 0) / hospitals.length)}%</strong><p>Network utilization</p></div><div className="rounded-md bg-secondary p-3"><strong>{alerts.length}</strong><p>Alerts</p></div><div className="rounded-md bg-secondary p-3"><strong>3</strong><p>User roles</p></div></div></Panel>
              <Panel title="Hospital Management" icon={Hospital}><div className="grid gap-2"><input className="rounded-md border border-input bg-background p-2" placeholder="Hospital name" value={newHospital.name} onChange={(e) => setNewHospital((s) => ({ ...s, name: e.target.value }))} /><div className="grid grid-cols-2 gap-2"><input className="rounded-md border border-input bg-background p-2" value={newHospital.state} onChange={(e) => setNewHospital((s) => ({ ...s, state: e.target.value }))} /><input className="rounded-md border border-input bg-background p-2" value={newHospital.city} onChange={(e) => setNewHospital((s) => ({ ...s, city: e.target.value }))} /></div><div className="grid grid-cols-3 gap-2"><input type="number" className="rounded-md border border-input bg-background p-2" value={newHospital.beds} onChange={(e) => setNewHospital((s) => ({ ...s, beds: Number(e.target.value) }))} /><input type="number" className="rounded-md border border-input bg-background p-2" value={newHospital.icu} onChange={(e) => setNewHospital((s) => ({ ...s, icu: Number(e.target.value) }))} /><input type="number" className="rounded-md border border-input bg-background p-2" value={newHospital.staff} onChange={(e) => setNewHospital((s) => ({ ...s, staff: Number(e.target.value) }))} /></div><Button variant="clinical" onClick={addHospital}><Plus className="h-4 w-4" />Add hospital</Button></div></Panel>
              <Panel title="Ambulance Management" icon={Ambulance}><div className="space-y-2">{hospital.ambulances.map((unit) => <div key={unit.id} className="rounded-md bg-secondary p-3 text-sm"><strong>{unit.id}</strong><p>{unit.driver} · Performance {unit.performance}%</p></div>)}<Button variant="export" onClick={() => updateHospital((record) => ({ ...record, ambulances: [...record.ambulances, { id: `AMB-${Date.now().toString().slice(-4)}`, driver: "New driver", status: "Available", location: "Base", eta: 12, performance: 82 }] }))}><Plus className="h-4 w-4" />Add ambulance</Button></div></Panel>
              <Panel title="Staff Management" icon={Users}><div className="space-y-2 text-sm"><p className="rounded-md bg-secondary p-3">Doctors: {hospital.doctors}; Nurses: {hospital.nurses}; burnout risk {staffAvailability < 65 ? "elevated" : "controlled"}.</p><p className="rounded-md bg-secondary p-3">AI scheduling: add 2 ICU nurses and 1 emergency physician to next shift.</p></div></Panel>
              <Panel title="Medicine Management" icon={Pill}><div className="grid gap-2"><input className="rounded-md border border-input bg-background p-2" placeholder="Medicine name" value={newMed.name} onChange={(e) => setNewMed((s) => ({ ...s, name: e.target.value }))} /><div className="grid grid-cols-2 gap-2"><input className="rounded-md border border-input bg-background p-2" value={newMed.category} onChange={(e) => setNewMed((s) => ({ ...s, category: e.target.value }))} /><input className="rounded-md border border-input bg-background p-2" type="date" value={newMed.expiry} onChange={(e) => setNewMed((s) => ({ ...s, expiry: e.target.value }))} /></div><div className="grid grid-cols-2 gap-2"><input type="number" className="rounded-md border border-input bg-background p-2" value={newMed.quantity} onChange={(e) => setNewMed((s) => ({ ...s, quantity: Number(e.target.value) }))} /><input type="number" className="rounded-md border border-input bg-background p-2" value={newMed.threshold} onChange={(e) => setNewMed((s) => ({ ...s, threshold: Number(e.target.value) }))} /></div><Button variant="clinical" onClick={addMedicine}><Plus className="h-4 w-4" />Add medicine</Button></div></Panel>
              <Panel title="Data Management" icon={Upload}><div className="space-y-2 text-sm"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-6"><Upload className="h-5 w-5" />Upload CSV / Excel<input type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => setEventLog((items) => [`Validated data file: ${e.target.files?.[0]?.name || "upload"}`, ...items])} /></label><p className="rounded-md bg-secondary p-3">Validation preview checks missing beds, duplicate ambulances, expiry dates, and abnormal inflow spikes.</p></div></Panel>
              <Panel title="Alert Config, AI Settings & Roles" icon={Stethoscope}><div className="space-y-3 text-sm"><label className="block">Prediction sensitivity<input type="range" min="1" max="10" defaultValue="7" className="mt-1 w-full accent-primary" /></label><label className="block">Alert frequency<input type="range" min="1" max="10" defaultValue="6" className="mt-1 w-full accent-primary" /></label><div className="grid grid-cols-3 gap-2 text-center"><span className="rounded-md bg-secondary p-2">Admin</span><span className="rounded-md bg-secondary p-2">Manager</span><span className="rounded-md bg-secondary p-2">Staff</span></div></div></Panel>
              <Panel title="Reports & Export" icon={FileSpreadsheet}><div className="grid gap-2"><Button variant="clinical" onClick={exportPdf}><Download className="h-4 w-4" />Generate PDF report</Button><Button variant="export" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4" />Export structured Excel</Button><p className="text-sm text-muted-foreground">Snapshots include KPIs, predictions, medicines, resources, ambulances, and recommendations.</p></div></Panel>
            </div>
          )}
        </section>
      </div>
      <FloatingCopilot hospital={hospital} alerts={alerts} dispatchAmbulance={dispatchAmbulance} />
    </main>
  );
}