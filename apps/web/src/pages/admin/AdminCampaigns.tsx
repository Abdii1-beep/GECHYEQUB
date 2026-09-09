import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { api, Campaign } from '../../lib/api';

interface CampaignForm {
  name: string;
  description: string;
  ticketPrice: string;
  maxTickets: string;
  startDate: string;
  endDate: string;
  drawDate: string;
  status?: string;
  // vehicle
  vMake: string;
  vModel: string;
  vYear: string;
  vColor: string;
  vEngine: string;
  vTransmission: string;
  vFuelType: string;
  vValue: string; // Real Car Price in ETB
  vCondition: string;
  vImages: string[];
  vVin: string;
  vLocation: string;
}

const defaultForm: CampaignForm = {
  name: '', description: '', ticketPrice: '', maxTickets: '',
  startDate: '', endDate: '', drawDate: '',
  vMake: '', vModel: '', vYear: '2025', vColor: 'Sinotruk Red',
  vEngine: '', vTransmission: 'Manual', vFuelType: 'Diesel',
  vValue: '', vCondition: 'BRAND_NEW',
  vImages: ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop'],
  vVin: '', vLocation: 'Kality Heavy Vehicle Yard, Addis Ababa',
};

interface VehiclePreset {
  category: 'COMMERCIAL_TRUCKS' | 'BYD_ELECTRIC' | 'LUXURY_4WD';
  name: string;
  badge: string;
  make: string;
  model: string;
  year: string;
  color: string;
  realPriceETB: string;
  ticketPriceETB: string;
  maxTicketsQuota: string;
  engine: string;
  trans: string;
  fuel: string;
  condition: string;
  location: string;
  images: string[];
}

const VEHICLE_PRESETS: VehiclePreset[] = [
  // 1. SINOTRUK "OBAMA" DUMP TRUCKS & LONG TRUCKS
  {
    category: 'COMMERCIAL_TRUCKS',
    name: 'Sinotruk HOWO 371 ("Obama" 10-Wheeler Tipper / Dump Truck)',
    badge: '🚛 HOWO "OBAMA" 10W',
    make: 'Sinotruk',
    model: 'HOWO 371 "Obama" Heavy Tipper (6x4)',
    year: '2025',
    color: 'Sinotruk Red / White Cabin',
    realPriceETB: '18500000',
    ticketPriceETB: '600',
    maxTicketsQuota: '40000',
    engine: 'WD615.47 371HP Euro II Turbo Diesel Intercooler',
    trans: 'Manual (10-Speed HW19710)',
    fuel: 'Diesel',
    condition: 'BRAND_NEW',
    location: 'Kality Heavy Equipment Yard, Addis Ababa',
    images: [
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1591768793355-74d04bb6608f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1586191582150-137996c56799?q=80&w=1200&auto=format&fit=crop',
    ],
  },
  {
    category: 'COMMERCIAL_TRUCKS',
    name: 'Sinotruk HOWO 380 ("Obama" 12-Wheeler 8x4 Heavy Mining Dump Truck)',
    badge: '🚛 HOWO "OBAMA" 12W',
    make: 'Sinotruk',
    model: 'HOWO 380 "Obama" 8x4 Heavy Mining Dump Truck',
    year: '2026',
    color: 'Engineering Yellow',
    realPriceETB: '22500000',
    ticketPriceETB: '750',
    maxTicketsQuota: '40000',
    engine: 'D10.38-40 380HP Heavy Duty Turbo Diesel',
    trans: 'Manual (12-Speed Heavy Planetary)',
    fuel: 'Diesel',
    condition: 'BRAND_NEW',
    location: 'Gelan Industrial Commercial Park, Ethiopia',
    images: [
      'https://images.unsplash.com/photo-1591768793355-74d04bb6608f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop',
    ],
  },
  {
    category: 'COMMERCIAL_TRUCKS',
    name: 'Sinotruk A7 420HP Long Haul Tractor Truck & 3-Axle Trailer',
    badge: '🚛 A7 LONG TRUCK & TRAILER',
    make: 'Sinotruk',
    model: 'A7 420HP Tractor & 40FT 3-Axle Flatbed Trailer',
    year: '2025',
    color: 'Diamond White / Red Chasis',
    realPriceETB: '28000000',
    ticketPriceETB: '1000',
    maxTicketsQuota: '35000',
    engine: 'D12.42-40 420HP Common Rail Euro III',
    trans: '16-Speed Heavy Hauler Overdrive',
    fuel: 'Diesel',
    condition: 'BRAND_NEW',
    location: 'Modjo Dry Port Logistics Hub, Ethiopia',
    images: [
      'https://images.unsplash.com/photo-1586191582150-137996c56799?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop',
    ],
  },
  {
    category: 'COMMERCIAL_TRUCKS',
    name: 'Isuzu FSR Forward 8-Ton Long Cargo Truck',
    badge: '🚚 ISUZU FSR CARGO',
    make: 'Isuzu',
    model: 'FSR 33L Forward 8-Ton Long Deck Cargo',
    year: '2025',
    color: 'Arcadia White',
    realPriceETB: '9800000',
    ticketPriceETB: '300',
    maxTicketsQuota: '45000',
    engine: '6HK1-TCN 6-Cylinder 240HP Turbo Diesel',
    trans: 'Manual 6-Speed',
    fuel: 'Diesel',
    condition: 'BRAND_NEW',
    location: 'Addis Ababa Commercial Yard',
    images: [
      'https://images.unsplash.com/photo-1559297434-fae8a1916a79?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop',
    ],
  },

  // 2. BYD ELECTRIC VEHICLES
  {
    category: 'BYD_ELECTRIC',
    name: 'BYD Seal AWD Luxury Electric Super-Sedan',
    badge: '⚡ BYD SEAL AWD',
    make: 'BYD',
    model: 'Seal AWD Performance 82.5kWh (523 HP)',
    year: '2025',
    color: 'Aurora Blue Metallic',
    realPriceETB: '7500000',
    ticketPriceETB: '250',
    maxTicketsQuota: '40000',
    engine: 'Dual Motor AWD (523 HP / 670 Nm / 0-100 in 3.8s)',
    trans: 'Single-Speed EV Direct Drive',
    fuel: 'Electric',
    condition: 'BRAND_NEW',
    location: 'Bole Medhanialem EV Showroom, Addis Ababa',
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=1200&auto=format&fit=crop',
    ],
  },
  {
    category: 'BYD_ELECTRIC',
    name: 'BYD Song Plus EV Flagship Luxury SUV',
    badge: '⚡ BYD SONG PLUS EV',
    make: 'BYD',
    model: 'Song Plus EV Flagship 71.7kWh Blade Battery',
    year: '2025',
    color: 'Time Grey Metallic',
    realPriceETB: '6800000',
    ticketPriceETB: '200',
    maxTicketsQuota: '45000',
    engine: 'Blade Battery EV (204 HP / 505km Range)',
    trans: 'Single-Speed EV',
    fuel: 'Electric',
    condition: 'BRAND_NEW',
    location: 'Sarbet EV Pavilion, Addis Ababa',
    images: [
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1200&auto=format&fit=crop',
    ],
  },

  // 3. LUXURY 4WD & SUPER VEHICLES
  {
    category: 'LUXURY_4WD',
    name: 'Toyota Land Cruiser 300 VXR ("V8" 3.5L Twin-Turbo)',
    badge: '🚗 LAND CRUISER 300',
    make: 'Toyota',
    model: 'Land Cruiser 300 VXR 3.5L Twin-Turbo (409 HP)',
    year: '2025',
    color: 'Precious White Pearl',
    realPriceETB: '28000000',
    ticketPriceETB: '800',
    maxTicketsQuota: '45000',
    engine: '3.5L V6 Twin-Turbo (409 HP / 650 Nm)',
    trans: '10-Speed Automatic Direct Shift',
    fuel: 'Gasoline',
    condition: 'BRAND_NEW',
    location: 'CMC Luxury Motors Showroom, Addis Ababa',
    images: [
      'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop',
    ],
  },
  {
    category: 'LUXURY_4WD',
    name: 'Mercedes-Benz G63 AMG 4MATIC BiTurbo',
    badge: '🚗 MERCEDES G63 AMG',
    make: 'Mercedes-Benz',
    model: 'G63 AMG 4MATIC 4.0L V8 BiTurbo (577 HP)',
    year: '2025',
    color: 'Obsidian Black Metallic',
    realPriceETB: '34000000',
    ticketPriceETB: '1000',
    maxTicketsQuota: '45000',
    engine: '4.0L V8 Biturbo Handcrafted AMG (577 HP)',
    trans: 'AMG SPEEDSHIFT TCT 9-Speed',
    fuel: 'Gasoline',
    condition: 'BRAND_NEW',
    location: 'Bole Road Exclusive Showroom, Addis Ababa',
    images: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=1200&auto=format&fit=crop',
    ],
  },
];

const PHOTO_PRESETS = [
  { label: 'Front Exterior', url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop' },
  { label: 'Side Heavy Angle', url: 'https://images.unsplash.com/photo-1591768793355-74d04bb6608f?q=80&w=1200&auto=format&fit=crop' },
  { label: 'Cockpit / Cabin', url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=1200&auto=format&fit=crop' },
  { label: 'Rear Cargo Bed', url: 'https://images.unsplash.com/photo-1586191582150-137996c56799?q=80&w=1200&auto=format&fit=crop' },
  { label: 'Heavy Wheels & Chassis', url: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?q=80&w=1200&auto=format&fit=crop' },
];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    DRAFT:      'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    PUBLISHED:  'bg-green-500/20  text-green-300  border border-green-500/30',
    COMPLETED:  'bg-blue-500/20   text-blue-300   border border-blue-500/30',
    CANCELLED:  'bg-red-500/20    text-red-300    border border-red-500/30',
    DRAW_READY: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  };
  return map[status] || 'bg-white/10 text-white/60';
};

const extractImages = (images: any): string[] => {
  if (!images) return ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop'];
  if (Array.isArray(images) && images.length > 0) return images.filter(Boolean);
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(Boolean);
      if (parsed) return [parsed];
    } catch {
      if (images.includes(',')) return images.split(',').map(s => s.trim()).filter(Boolean);
      return [images];
    }
  }
  return ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop'];
};

const AdminCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns]     = useState<Campaign[]>([]);
  const [loading, setLoading]         = useState(true);
  
  // Modals state
  const [showCreate, setShowCreate]   = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Form states
  const [form, setForm]               = useState<CampaignForm>(defaultForm);
  const [editForm, setEditForm]       = useState<CampaignForm>(defaultForm);
  
  // URL input & upload states
  const [newCreateImageUrl, setNewCreateImageUrl] = useState('');
  const [newEditImageUrl, setNewEditImageUrl]     = useState('');
  const [uploading, setUploading]                 = useState(false);

  // Filter preset tab
  const [activePresetCategory, setActivePresetCategory] = useState<string>('ALL');

  const [saving, setSaving]           = useState(false);
  const [actionId, setActionId]       = useState<string | null>(null);
  const [msg, setMsg]                 = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const fileInputRefCreate = useRef<HTMLInputElement>(null);
  const fileInputRefEdit   = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('auth_token');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getAdminCampaigns();
    if (res.success && res.data) setCampaigns(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    load();
  }, [load, navigate, token]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // --- LOCAL FILE UPLOAD HANDLER ---
  const handleFileUpload = async (files: FileList | null, isEdit: boolean) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload to server
        const res = await api.uploadImage(base64Data, file.name);
        if (res.success && res.data?.url) {
          const uploadedUrl = res.data.url;
          if (isEdit) {
            setEditForm(f => ({ ...f, vImages: [...f.vImages, uploadedUrl] }));
          } else {
            setForm(f => ({ ...f, vImages: [...f.vImages, uploadedUrl] }));
          }
        } else {
          // Fallback: use the base64 data URL directly if server upload had an issue
          if (isEdit) {
            setEditForm(f => ({ ...f, vImages: [...f.vImages, base64Data] }));
          } else {
            setForm(f => ({ ...f, vImages: [...f.vImages, base64Data] }));
          }
        }
      }
      flash('ok', `Successfully uploaded and added ${files.length} car photo(s)!`);
    } catch (err: any) {
      flash('err', err?.message || 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  // Preset Applicator
  const applyPreset = (preset: VehiclePreset, isEdit: boolean) => {
    const targetSetter = isEdit ? setEditForm : setForm;
    targetSetter(f => ({
      ...f,
      name: `${preset.year} ${preset.name} Official Lottery`,
      ticketPrice: preset.ticketPriceETB,
      maxTickets: preset.maxTicketsQuota,
      vMake: preset.make,
      vModel: preset.model,
      vYear: preset.year,
      vColor: preset.color,
      vValue: preset.realPriceETB,
      vEngine: preset.engine,
      vTransmission: preset.trans,
      vFuelType: preset.fuel,
      vCondition: preset.condition,
      vLocation: preset.location,
      vImages: preset.images.length > 0 ? preset.images : f.vImages,
      vVin: `ETH-${preset.make.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`,
    }));
    flash('ok', `Applied template: ${preset.name}`);
  };

  // --- CREATE LOGIC ---
  const handleCreate = async () => {
    if (!form.name || !form.ticketPrice || !form.maxTickets || !form.startDate || !form.endDate) {
      flash('err', 'Please fill all required fields'); return;
    }
    setSaving(true);
    const payload: any = {
      name: form.name, description: form.description,
      ticketPrice: Number(form.ticketPrice), maxTickets: Number(form.maxTickets),
      startDate: form.startDate, endDate: form.endDate,
      drawDate: form.drawDate || undefined,
    };
    if (form.vMake) {
      payload.vehicle = {
        make: form.vMake,
        model: form.vModel,
        year: Number(form.vYear) || 2025,
        color: form.vColor,
        engineInfo: form.vEngine,
        transmission: form.vTransmission,
        fuelType: form.vFuelType,
        declaredValue: Number(form.vValue) || 0,
        vehicleCondition: form.vCondition,
        vinChassisNumber: form.vVin || `ETH-VIN-${Date.now().toString().slice(-8)}`,
        location: form.vLocation || 'Addis Ababa, Ethiopia',
        images: form.vImages.length > 0 ? form.vImages : ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop'],
      };
    }
    const res = await api.createCampaign(payload);
    setSaving(false);
    if (res.success) {
      flash('ok', 'Campaign created successfully!');
      setShowCreate(false);
      setForm(defaultForm);
      setNewCreateImageUrl('');
      load();
    } else {
      flash('err', res.error || 'Failed to create campaign');
    }
  };

  // --- EDIT LOGIC ---
  const handleOpenEdit = (c: Campaign) => {
    setEditingCampaign(c);
    const v = c.vehicles && c.vehicles.length > 0 ? c.vehicles[0] : null;
    const vImages = v ? extractImages(v.images) : ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop'];

    setEditForm({
      name: c.name || '',
      description: c.description || '',
      ticketPrice: String(c.ticketPrice || ''),
      maxTickets: String(c.maxTickets || ''),
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      drawDate: c.drawDate ? c.drawDate.slice(0, 16) : '',
      status: c.status || 'DRAFT',
      vMake: v?.make || '',
      vModel: v?.model || '',
      vYear: String(v?.year || '2025'),
      vColor: v?.color || 'Sinotruk Red',
      vEngine: v?.engineInfo || '',
      vTransmission: v?.transmission || 'Manual',
      vFuelType: v?.fuelType || 'Diesel',
      vValue: String(v?.declaredValue || ''),
      vCondition: v?.vehicleCondition || 'BRAND_NEW',
      vImages,
      vVin: v?.vinChassisNumber || '',
      vLocation: v?.location || 'Addis Ababa, Ethiopia',
    });
    setNewEditImageUrl('');
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editingCampaign) return;
    if (!editForm.name || !editForm.startDate || !editForm.endDate) {
      flash('err', 'Please fill all required campaign fields'); return;
    }
    setSaving(true);

    const payload: any = {
      name: editForm.name,
      description: editForm.description,
      ticketPrice: Number(editForm.ticketPrice),
      maxTickets: Number(editForm.maxTickets),
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      drawDate: editForm.drawDate || null,
      status: editForm.status,
      vehicle: {
        make: editForm.vMake,
        model: editForm.vModel,
        year: Number(editForm.vYear) || 2025,
        color: editForm.vColor,
        engineInfo: editForm.vEngine,
        transmission: editForm.vTransmission,
        fuelType: editForm.vFuelType,
        declaredValue: Number(editForm.vValue) || 0,
        vehicleCondition: editForm.vCondition,
        vinChassisNumber: editForm.vVin,
        location: editForm.vLocation,
        images: editForm.vImages.length > 0 ? editForm.vImages : ['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop'],
      }
    };

    const res = await api.updateCampaign(editingCampaign.id, payload);
    setSaving(false);
    if (res.success) {
      flash('ok', 'Campaign, price quotas, and car photos updated successfully!');
      setShowEdit(false);
      setEditingCampaign(null);
      load();
    } else {
      flash('err', res.error || 'Failed to update campaign');
    }
  };

  const handlePublish = async (id: string) => {
    setActionId(id);
    const res = await api.publishCampaign(id);
    setActionId(null);
    if (res.success) { flash('ok', 'Campaign published!'); load(); }
    else flash('err', res.error || 'Failed to publish');
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this campaign?')) return;
    setActionId(id);
    const res = await api.cancelCampaign(id);
    setActionId(null);
    if (res.success) { flash('ok', 'Campaign cancelled'); load(); }
    else flash('err', res.error || 'Failed to cancel');
  };

  const handleDraw = (id: string) => {
    navigate(`/admin/draw/${id}`);
  };

  // Reusable Image Gallery & Manager for Forms
  const renderImageManager = (
    images: string[],
    newUrl: string,
    setNewUrl: (v: string) => void,
    onAdd: (url: string) => void,
    onRemove: (idx: number) => void,
    onSetCover: (idx: number) => void,
    isEdit: boolean
  ) => {
    const fileRef = isEdit ? fileInputRefEdit : fileInputRefCreate;

    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-white font-semibold text-xs">
            📸 Car Photos & Images Gallery ({images.length} photos)
          </label>
          <span className="text-[11px] text-yellow-400 font-medium">★ First image is Cover</span>
        </div>

        {/* 1. Drag & Drop / File Upload Box */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files, isEdit);
          }}
          className="border-2 border-dashed border-primary-500/40 hover:border-primary-400 bg-primary-500/5 hover:bg-primary-500/10 rounded-2xl p-5 mb-4 text-center cursor-pointer transition-all group"
        >
          <input
            type="file"
            ref={fileRef}
            onChange={(e) => handleFileUpload(e.target.files, isEdit)}
            multiple
            accept="image/*"
            className="hidden"
          />
          <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">📁</div>
          <div className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors">
            {uploading ? 'Uploading High-Resolution Photos...' : 'Click to Upload or Drag & Drop Car Images'}
          </div>
          <div className="text-xs text-white/50 mt-1">
            Upload multiple photos from your computer (PNG, JPG, WebP)
          </div>
        </div>

        {/* 2. Grid of Added Photos */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden bg-black/60 border border-white/15 aspect-video flex items-center justify-center">
                <img
                  src={img}
                  alt={`Car photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop';
                  }}
                />
                {idx === 0 ? (
                  <span className="absolute top-1.5 left-1.5 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                    ★ COVER
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetCover(idx)}
                    className="absolute top-1.5 left-1.5 bg-black/80 hover:bg-yellow-500 hover:text-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Set Cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow transition-transform group-hover:scale-110"
                  title="Remove image"
                >
                  ×
                </button>
                <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-white/70 px-1 rounded">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 3. Input to add photo via URL */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Or paste image URL (https://...)"
            className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newUrl.trim()) { onAdd(newUrl.trim()); setNewUrl(''); }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (newUrl.trim()) { onAdd(newUrl.trim()); setNewUrl(''); }
            }}
            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 flex-shrink-0"
          >
            <span>+</span> Add URL
          </button>
        </div>

        {/* 4. Preset Quick Angle Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
          <span className="text-[10px] text-white/40 mr-1">Quick Sample Angles:</span>
          {PHOTO_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onAdd(p.url)}
              className="text-[10px] px-2 py-1 bg-white/5 hover:bg-white/15 text-white/70 hover:text-white rounded-lg border border-white/10 transition-colors"
            >
              + {p.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Reusable Financial & Price Quotas Calculator Matrix
  const renderPriceQuotasMatrix = (
    realPriceStr: string,
    ticketPriceStr: string,
    maxTicketsStr: string,
    onRealPriceChange: (v: string) => void,
    onTicketPriceChange: (v: string) => void,
    onMaxTicketsChange: (v: string) => void,
    soldTickets = 0
  ) => {
    const realPrice = Number(realPriceStr) || 0;
    const ticketPrice = Number(ticketPriceStr) || 0;
    const maxTickets = Number(maxTicketsStr) || 0;

    const grossPool = ticketPrice * maxTickets;
    const netSurplus = grossPool - realPrice;
    const breakevenTickets = ticketPrice > 0 ? Math.ceil(realPrice / ticketPrice) : 0;
    const breakevenPct = maxTickets > 0 ? (breakevenTickets / maxTickets) * 100 : 0;

    return (
      <div className="bg-gradient-to-br from-yellow-500/10 via-emerald-500/10 to-transparent border border-yellow-500/30 rounded-2xl p-5 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">
              <span>💰</span> Real Car Price (ETB) & Lottery Price Quotas
            </h4>
            <p className="text-[11px] text-white/50 mt-0.5">
              Specify the real market value in Ethiopian Birr, per-ticket price, and ticket quota allocation.
            </p>
          </div>
          {realPrice > 0 && (
            <span className="text-xs font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2.5 py-1 rounded-lg">
              {realPrice.toLocaleString()} ETB Real Value
            </span>
          )}
        </div>

        {/* Input Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-white/70 text-xs mb-1 font-semibold">
              Real Car Market Price (in Ethiopian Birr) *
            </label>
            <input
              type="number"
              value={realPriceStr}
              onChange={(e) => onRealPriceChange(e.target.value)}
              placeholder="e.g. 18500000"
              className="w-full bg-white/5 border border-yellow-500/40 rounded-xl px-3.5 py-2.5 text-yellow-400 font-black text-base focus:outline-none focus:border-yellow-400"
            />
            <span className="text-[10px] text-white/40 mt-1 block">
              {realPrice > 0 ? `${(realPrice / 1000000).toFixed(2)} Million ETB` : 'e.g. 18.5M for Sinotruk Obama'}
            </span>
          </div>

          <div>
            <label className="block text-white/70 text-xs mb-1 font-semibold">
              Ticket Price Quota (ETB / ticket) *
            </label>
            <input
              type="number"
              value={ticketPriceStr}
              onChange={(e) => onTicketPriceChange(e.target.value)}
              placeholder="e.g. 600"
              className="w-full bg-white/5 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-emerald-300 font-black text-base focus:outline-none focus:border-emerald-400"
            />
            {soldTickets > 0 ? (
              <span className="text-[10px] text-amber-400 mt-1 block">Active draw: {soldTickets} tickets sold</span>
            ) : (
              <span className="text-[10px] text-white/40 mt-1 block">Cost per lottery entry in ETB</span>
            )}
          </div>

          <div>
            <label className="block text-white/70 text-xs mb-1 font-semibold">
              Total Ticket Quota (Max Tickets) *
            </label>
            <input
              type="number"
              value={maxTicketsStr}
              min={soldTickets || 1}
              onChange={(e) => onMaxTicketsChange(e.target.value)}
              placeholder="e.g. 40000"
              className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-black text-base focus:outline-none focus:border-white"
            />
            {soldTickets > 0 ? (
              <span className="text-[10px] text-emerald-400 mt-1 block">Must be ≥ {soldTickets} (sold count)</span>
            ) : (
              <span className="text-[10px] text-white/40 mt-1 block">Raffle capacity quota</span>
            )}
          </div>
        </div>

        {/* Live Financial Quotas Matrix Cards */}
        {ticketPrice > 0 && maxTickets > 0 && (
          <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
              <span className="text-white/40 block text-[10px]">Target Gross Quota Pool</span>
              <span className="text-white font-black text-sm">{grossPool.toLocaleString()} ETB</span>
            </div>
            <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
              <span className="text-white/40 block text-[10px]">Real Car Price</span>
              <span className="text-yellow-400 font-black text-sm">{realPrice > 0 ? `${realPrice.toLocaleString()} ETB` : '0 ETB'}</span>
            </div>
            <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
              <span className="text-white/40 block text-[10px]">Projected Surplus Margin</span>
              <span className={`font-black text-sm ${netSurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {netSurplus >= 0 ? `+${netSurplus.toLocaleString()} ETB` : `${netSurplus.toLocaleString()} ETB`}
              </span>
            </div>
            <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
              <span className="text-white/40 block text-[10px]">Breakeven Quota</span>
              <span className="text-cyan-300 font-black text-sm">
                {breakevenTickets.toLocaleString()} <span className="text-[10px] text-white/40 font-normal">({breakevenPct.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Campaigns & Fleet Management</h1>
            <p className="text-white/40 mt-1">
              Create and edit lotteries for BYD, Sinotruk ("Obama"), Long Trucks, assign price quotas, real prices in ETB, and upload car photos.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg"
          >
            + New Campaign
          </button>
        </div>

        {/* Flash Notifications */}
        {msg && (
          <div className={`mb-5 p-4 rounded-xl text-sm font-medium ${msg.type === 'ok' ? 'bg-green-500/15 border border-green-500/30 text-green-300' : 'bg-red-500/15 border border-red-500/30 text-red-300'}`}>
            {msg.text}
          </div>
        )}

        {/* Campaign list */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-xl">No campaigns yet</p>
            <p className="text-sm mt-2">Create your first campaign to get started</p>
          </div>
        ) : (
          <div className="space-y-5">
            {campaigns.map(c => {
              const soldCount = c.soldTickets ?? c._count?.tickets ?? 0;
              const remainingCount = c.remainingTickets ?? Math.max(0, c.maxTickets - soldCount);
              const soldPercent = c.maxTickets > 0 ? ((soldCount / c.maxTickets) * 100) : 0;
              const v = c.vehicles && c.vehicles.length > 0 ? c.vehicles[0] : null;
              const carImages = v ? extractImages(v.images) : [];

              return (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{c.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(c.status)}`}>{c.status}</span>
                      </div>
                      {c.description && <p className="text-white/40 text-sm mb-4">{c.description}</p>}

                      {/* --- KEY FINANCIAL METRICS: REAL CAR PRICE, TICKET PRICE, QUOTA & REMAINING --- */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        {/* 1. Real Car Market Price in ETB */}
                        <div className="bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-transparent border border-yellow-500/30 rounded-xl p-3.5">
                          <div className="text-yellow-400 font-semibold text-xs mb-1">Real Car Value (ETB)</div>
                          <div className="text-yellow-400 font-black text-lg">
                            {v?.declaredValue ? `${v.declaredValue.toLocaleString()} ETB` : 'N/A'}
                          </div>
                        </div>

                        {/* 2. Ticket Price Quota */}
                        <div className="bg-white/5 border border-white/8 rounded-xl p-3.5">
                          <div className="text-white/40 text-xs mb-1">Ticket Price</div>
                          <div className="text-emerald-400 font-black text-lg">{c.ticketPrice.toLocaleString()} ETB</div>
                        </div>

                        {/* 3. Total Ticket Quota */}
                        <div className="bg-white/5 border border-white/8 rounded-xl p-3.5">
                          <div className="text-white/40 text-xs mb-1">Total Ticket Quota</div>
                          <div className="text-white font-bold text-lg">{c.maxTickets.toLocaleString()}</div>
                        </div>

                        {/* 4. Tickets Remaining (Prominent) */}
                        <div className="bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 rounded-xl p-3.5">
                          <div className="text-emerald-300 text-xs font-semibold mb-1">Tickets Remaining</div>
                          <div className="text-emerald-300 font-black text-lg">
                            {remainingCount.toLocaleString()} Left
                          </div>
                        </div>
                      </div>

                      {/* Visual Tickets Progress Bar */}
                      <div className="mt-3 bg-black/40 border border-white/10 rounded-xl p-3">
                        <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                          <span className="text-white/60">Quota Availability Progress</span>
                          <span className="text-emerald-400 font-bold">
                            {remainingCount.toLocaleString()} Remaining / {c.maxTickets.toLocaleString()} Quota ({soldPercent.toFixed(1)}% Sold)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-yellow-400 rounded-full transition-all duration-500 shadow-glow"
                            style={{ width: `${Math.max(2, Math.min(100, soldPercent))}%` }}
                          />
                        </div>
                      </div>

                      {/* Vehicle Details & Multiple Photos Strip */}
                      {v && (
                        <div className="mt-4 bg-black/40 border border-white/10 rounded-2xl p-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-start">
                            {/* Main Cover Car Image */}
                            <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-black/60 flex-shrink-0 border border-white/10 relative group">
                              <img
                                src={carImages[0] || 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop'}
                                alt={`${v.make} ${v.model}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop';
                                }}
                              />
                              <span className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded font-medium">
                                📸 {carImages.length} {carImages.length === 1 ? 'Photo' : 'Photos'}
                              </span>
                            </div>

                            {/* Vehicle Specs */}
                            <div className="flex-1 space-y-1.5 text-xs w-full">
                              <div className="flex items-center justify-between">
                                <span className="text-white font-bold text-sm">
                                  🚛 {v.make} {v.model} ({v.year})
                                </span>
                                <span className="text-yellow-400 font-extrabold text-sm">
                                  Real Price: {v.declaredValue ? `${v.declaredValue.toLocaleString()} ETB` : ''}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-white/50">
                                {v.color && <span>Color: {v.color}</span>}
                                {v.engineInfo && <span>• {v.engineInfo}</span>}
                                {v.transmission && <span>• {v.transmission}</span>}
                                {v.vehicleCondition && <span>• {v.vehicleCondition}</span>}
                                {v.location && <span>• 📍 {v.location}</span>}
                              </div>

                              {/* Thumbnails Gallery Strip */}
                              {carImages.length > 1 && (
                                <div className="pt-2 mt-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
                                  <span className="text-[10px] text-white/40 flex-shrink-0">Gallery:</span>
                                  {carImages.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="w-12 h-8 rounded-lg overflow-hidden border border-white/15 flex-shrink-0 bg-black/50 hover:border-yellow-400 transition-colors cursor-pointer"
                                      onClick={() => window.open(imgUrl, '_blank')}
                                      title={`View full photo #${imgIdx + 1}`}
                                    >
                                      <img
                                        src={imgUrl}
                                        alt={`Thumbnail ${imgIdx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex flex-col gap-2 ml-6 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="px-4 py-2 bg-blue-600/25 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 text-sm font-bold rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
                      >
                        ✏️ Edit & Upload Photos
                      </button>

                      {c.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePublish(c.id)}
                          disabled={actionId === c.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                          {actionId === c.id ? '...' : '🚀 Publish'}
                        </button>
                      )}
                      {c.status === 'PUBLISHED' && (
                        <button
                          onClick={() => handleDraw(c.id)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg animate-pulse"
                        >
                          🎲 Run Draw
                        </button>
                      )}
                      {(c.status === 'DRAFT' || c.status === 'PUBLISHED') && (
                        <button
                          onClick={() => handleCancel(c.id)}
                          disabled={actionId === c.id}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                          ✕ Cancel
                        </button>
                      )}
                      <button
                        onClick={() => window.open(`/live/${c.id}`, '_blank')}
                        className="px-4 py-2 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 text-sm font-semibold rounded-xl border border-yellow-500/30 transition-colors"
                      >
                        🎥 Live Room
                      </button>
                      <button
                        onClick={() => navigate(`/campaign/${c.id}`)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-xl border border-white/10 transition-colors"
                      >
                        👁 View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* EDIT CAMPAIGN, REAL PRICE & PHOTO UPLOAD MODAL */}
        {/* ========================================================================= */}
        {showEdit && editingCampaign && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gray-900 border border-white/20 rounded-3xl w-full max-w-3xl my-8 shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>✏️</span> Edit Campaign, Price Quotas & Car Photos
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    Update real market price in ETB, ticket quota, vehicle specs, and upload or manage photos
                  </p>
                </div>
                <button
                  onClick={() => { setShowEdit(false); setEditingCampaign(null); }}
                  className="text-white/40 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* 1. Vehicle Presets Bar for Edit */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Quick Vehicle Presets:</span>
                    <div className="flex gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setActivePresetCategory('COMMERCIAL_TRUCKS')}
                        className={`px-2 py-1 rounded-md ${activePresetCategory === 'COMMERCIAL_TRUCKS' ? 'bg-amber-500 text-black font-bold' : 'bg-white/10 text-white/70'}`}
                      >
                        🚛 Sinotruk & "Obama" Trucks
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePresetCategory('BYD_ELECTRIC')}
                        className={`px-2 py-1 rounded-md ${activePresetCategory === 'BYD_ELECTRIC' ? 'bg-cyan-500 text-black font-bold' : 'bg-white/10 text-white/70'}`}
                      >
                        ⚡ BYD Electric
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePresetCategory('ALL')}
                        className={`px-2 py-1 rounded-md ${activePresetCategory === 'ALL' ? 'bg-white/25 text-white font-bold' : 'bg-white/10 text-white/70'}`}
                      >
                        All
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {VEHICLE_PRESETS.filter(p => activePresetCategory === 'ALL' || p.category === activePresetCategory).map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset, true)}
                        className="text-[11px] px-2.5 py-1.5 bg-white/5 hover:bg-white/15 border border-white/15 hover:border-yellow-400 text-white rounded-lg transition-all"
                      >
                        {preset.badge}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Real Car Price & Price Quotas Matrix */}
                {renderPriceQuotasMatrix(
                  editForm.vValue,
                  editForm.ticketPrice,
                  editForm.maxTickets,
                  (v) => setEditForm(f => ({ ...f, vValue: v })),
                  (v) => setEditForm(f => ({ ...f, ticketPrice: v })),
                  (v) => setEditForm(f => ({ ...f, maxTickets: v })),
                  editingCampaign.soldTickets ?? editingCampaign._count?.tickets ?? 0
                )}

                {/* 3. Photos Upload & Gallery Manager */}
                {renderImageManager(
                  editForm.vImages,
                  newEditImageUrl,
                  setNewEditImageUrl,
                  (url) => setEditForm(f => ({ ...f, vImages: [...f.vImages, url] })),
                  (idx) => setEditForm(f => ({ ...f, vImages: f.vImages.filter((_, i) => i !== idx) })),
                  (idx) => setEditForm(f => {
                    const updated = [...f.vImages];
                    const [selected] = updated.splice(idx, 1);
                    updated.unshift(selected);
                    return { ...f, vImages: updated };
                  }),
                  true
                )}

                {/* 4. Campaign Information */}
                <div>
                  <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3">Campaign Information</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Campaign Name *</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                        placeholder="e.g. Sinotruk HOWO 371 Dump Truck Grand Raffle"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400 resize-none"
                        placeholder="Vehicle specs, lottery conditions..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-white/60 text-xs mb-1">Start Date *</label>
                        <input
                          type="date"
                          value={editForm.startDate}
                          onChange={(e) => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-white/60 text-xs mb-1">End Date *</label>
                        <input
                          type="date"
                          value={editForm.endDate}
                          onChange={(e) => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-white/60 text-xs mb-1">Live Draw Date & Time</label>
                        <input
                          type="datetime-local"
                          value={editForm.drawDate}
                          onChange={(e) => setEditForm(f => ({ ...f, drawDate: e.target.value }))}
                          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Vehicle Specifications */}
                <div>
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Vehicle Details & Specs</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Make (e.g. Sinotruk, BYD)</label>
                      <input
                        type="text"
                        value={editForm.vMake}
                        onChange={(e) => setEditForm(f => ({ ...f, vMake: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Model (e.g. HOWO 371 "Obama")</label>
                      <input
                        type="text"
                        value={editForm.vModel}
                        onChange={(e) => setEditForm(f => ({ ...f, vModel: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Year</label>
                      <input
                        type="number"
                        value={editForm.vYear}
                        onChange={(e) => setEditForm(f => ({ ...f, vYear: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Color</label>
                      <input
                        type="text"
                        value={editForm.vColor}
                        onChange={(e) => setEditForm(f => ({ ...f, vColor: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Engine / Horsepower</label>
                      <input
                        type="text"
                        value={editForm.vEngine}
                        onChange={(e) => setEditForm(f => ({ ...f, vEngine: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                        placeholder="e.g. 371HP Turbo Diesel"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Transmission</label>
                      <select
                        value={editForm.vTransmission}
                        onChange={(e) => setEditForm(f => ({ ...f, vTransmission: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      >
                        {['Manual', 'Automatic', 'Dual-Clutch', 'Single-Speed EV', '10-Speed Heavy', '12-Speed Heavy', '16-Speed Heavy'].map(o => (
                          <option key={o} value={o} className="bg-gray-900">{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Fuel Type</label>
                      <select
                        value={editForm.vFuelType}
                        onChange={(e) => setEditForm(f => ({ ...f, vFuelType: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      >
                        {['Diesel', 'Gasoline', 'Electric', 'Hybrid', 'Plug-in Hybrid'].map(o => (
                          <option key={o} value={o} className="bg-gray-900">{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Condition</label>
                      <select
                        value={editForm.vCondition}
                        onChange={(e) => setEditForm(f => ({ ...f, vCondition: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      >
                        {['BRAND_NEW', 'CERTIFIED_PRE_OWNED', 'USED'].map(o => (
                          <option key={o} value={o} className="bg-gray-900">{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Location / Depot</label>
                      <input
                        type="text"
                        value={editForm.vLocation}
                        onChange={(e) => setEditForm(f => ({ ...f, vLocation: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setShowEdit(false); setEditingCampaign(null); }}
                  className="flex-1 px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : '💾 Save Changes & Quotas'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CREATE NEW CAMPAIGN MODAL */}
        {/* ========================================================================= */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gray-900 border border-white/15 rounded-3xl w-full max-w-3xl my-8 shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-xl font-bold text-white">Create New Lottery Campaign</h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    Set up real price in ETB, ticket quota, upload car photos, or choose BYD, Sinotruk "Obama", or Long Truck presets
                  </p>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Vehicle Presets Category Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Select Pre-configured Ethiopian Vehicle:</span>
                    <div className="flex gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setActivePresetCategory('COMMERCIAL_TRUCKS')}
                        className={`px-2 py-1 rounded-md ${activePresetCategory === 'COMMERCIAL_TRUCKS' ? 'bg-amber-500 text-black font-bold' : 'bg-white/10 text-white/70'}`}
                      >
                        🚛 Sinotruk & "Obama" Trucks
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePresetCategory('BYD_ELECTRIC')}
                        className={`px-2 py-1 rounded-md ${activePresetCategory === 'BYD_ELECTRIC' ? 'bg-cyan-500 text-black font-bold' : 'bg-white/10 text-white/70'}`}
                      >
                        ⚡ BYD Electric
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePresetCategory('ALL')}
                        className={`px-2 py-1 rounded-md ${activePresetCategory === 'ALL' ? 'bg-white/25 text-white font-bold' : 'bg-white/10 text-white/70'}`}
                      >
                        All
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {VEHICLE_PRESETS.filter(p => activePresetCategory === 'ALL' || p.category === activePresetCategory).map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset, false)}
                        className="text-[11px] px-2.5 py-1.5 bg-white/5 hover:bg-white/15 border border-white/15 hover:border-yellow-400 text-white rounded-lg transition-all"
                      >
                        {preset.badge}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real Price in ETB & Price Quotas Matrix */}
                {renderPriceQuotasMatrix(
                  form.vValue,
                  form.ticketPrice,
                  form.maxTickets,
                  (v) => setForm(f => ({ ...f, vValue: v })),
                  (v) => setForm(f => ({ ...f, ticketPrice: v })),
                  (v) => setForm(f => ({ ...f, maxTickets: v }))
                )}

                {/* Photo Upload & Gallery Manager */}
                {renderImageManager(
                  form.vImages,
                  newCreateImageUrl,
                  setNewCreateImageUrl,
                  (url) => setForm(f => ({ ...f, vImages: [...f.vImages, url] })),
                  (idx) => setForm(f => ({ ...f, vImages: f.vImages.filter((_, i) => i !== idx) })),
                  (idx) => setForm(f => {
                    const updated = [...f.vImages];
                    const [selected] = updated.splice(idx, 1);
                    updated.unshift(selected);
                    return { ...f, vImages: updated };
                  }),
                  false
                )}

                {/* Campaign Info */}
                <div>
                  <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3">Campaign Information</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Campaign Name *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
                        placeholder="e.g. Sinotruk HOWO 371 'Obama' Dump Truck Grand Lottery"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400 resize-none"
                        placeholder="Describe vehicle features, payload capacity, raffle conditions..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-white/60 text-xs mb-1">Start Date *</label>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-white/60 text-xs mb-1">End Date *</label>
                        <input
                          type="date"
                          value={form.endDate}
                          onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-white/60 text-xs mb-1">Live Draw Date & Time</label>
                        <input
                          type="datetime-local"
                          value={form.drawDate}
                          onChange={(e) => setForm(f => ({ ...f, drawDate: e.target.value }))}
                          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Car Specifications */}
                <div>
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">Vehicle Details & Specs</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Make</label>
                      <input
                        type="text"
                        value={form.vMake}
                        onChange={(e) => setForm(f => ({ ...f, vMake: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                        placeholder="e.g. Sinotruk"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Model</label>
                      <input
                        type="text"
                        value={form.vModel}
                        onChange={(e) => setForm(f => ({ ...f, vModel: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                        placeholder="e.g. HOWO 371 'Obama'"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Year</label>
                      <input
                        type="number"
                        value={form.vYear}
                        onChange={(e) => setForm(f => ({ ...f, vYear: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Color</label>
                      <input
                        type="text"
                        value={form.vColor}
                        onChange={(e) => setForm(f => ({ ...f, vColor: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Engine / Horsepower</label>
                      <input
                        type="text"
                        value={form.vEngine}
                        onChange={(e) => setForm(f => ({ ...f, vEngine: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                        placeholder="e.g. 371HP Turbo Diesel"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Transmission</label>
                      <select
                        value={form.vTransmission}
                        onChange={(e) => setForm(f => ({ ...f, vTransmission: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      >
                        {['Manual', 'Automatic', 'Dual-Clutch', 'Single-Speed EV', '10-Speed Heavy', '12-Speed Heavy', '16-Speed Heavy'].map(o => (
                          <option key={o} value={o} className="bg-gray-900">{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Fuel Type</label>
                      <select
                        value={form.vFuelType}
                        onChange={(e) => setForm(f => ({ ...f, vFuelType: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      >
                        {['Diesel', 'Gasoline', 'Electric', 'Hybrid', 'Plug-in Hybrid'].map(o => (
                          <option key={o} value={o} className="bg-gray-900">{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs mb-1">Location / Depot</label>
                      <input
                        type="text"
                        value={form.vLocation}
                        onChange={(e) => setForm(f => ({ ...f, vLocation: e.target.value }))}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Campaign & Quotas'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminCampaigns;
