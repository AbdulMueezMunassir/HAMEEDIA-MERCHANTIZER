import React, { useState, useEffect, useRef } from 'react';
import './index.css';

// Smart Backend URL list (tries localhost:8000 PHP server, then IIS paths)
const CANDIDATE_APIS = [
  'http://localhost:8000',
  'http://localhost/Merchantizer/backend_php',
  'http://localhost/backend_php',
  '.'
];

// Preset Options for Styled Dropdowns
const CATEGORY_OPTIONS = ['Shirting', 'Suiting', 'Trousering', 'Linen', 'Denim', 'Ceremonial Jacquard', 'Knitwear'];
const WEAR_OPTIONS = ['Formal Wear', 'Casual Wear', 'Smart Casual', 'Ceremonial / Festive', 'Party Wear', 'Office Wear'];
const WEAVE_OPTIONS = ['Twill Weave', 'Plain / Poplin', 'Oxford Weave', 'Dobby Weave', 'Jacquard', 'Herringbone', 'Satin'];
const SEASON_OPTIONS = ['December Christmas', 'Ramadhan March', 'Sinhala & Tamil New Year', 'Summer Linen Collection', 'Wedding Season'];

// Initial Seed Fabric (Sochers 250m Christmas -> Ramadan)
const INITIAL_SEED_FABRICS = [
  {
    id: 1,
    supplier: 'Sochers',
    supplier_no: 'SUP-DEC-001',
    contain: '100% Egyptian Cotton',
    gsm: '180',
    article_no: 'FAB-250-XMAS',
    fabric_category: 'Shirting',
    wear_type: 'Formal Wear',
    design_weave: 'Twill Weave',
    fabric_designer: 'M. Perera',
    item_family: 'Envoy Luxury Shirts',
    color_code: 'Navy Blue #0B2545',
    concept_code: 'CON-XMAS-26',
    width: '58"',
    total_fabric: 250,
    overall_balance: 200,
    current_season: 'December Christmas',
    next_season_target: 'Ramadhan March',
    is_ordered: true,
    images_list: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80'
    ],
    articles: [
      { id: 101, article_code: 'Article A', allocated_qty: 50, used_qty: 10, balance_qty: 40 },
      { id: 102, article_code: 'Article B', allocated_qty: 50, used_qty: 10, balance_qty: 40 },
      { id: 103, article_code: 'Article C', allocated_qty: 50, used_qty: 10, balance_qty: 40 },
      { id: 104, article_code: 'Article D', allocated_qty: 50, used_qty: 10, balance_qty: 40 },
      { id: 105, article_code: 'Article E', allocated_qty: 50, used_qty: 10, balance_qty: 40 }
    ]
  }
];

// Convert File object to base64 DataURL so images persist even without PHP server
const fileToDataUrl = (file) =>
  new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(URL.createObjectURL(file));
    reader.readAsDataURL(file);
  });

export default function App() {
  const [apiBase, setApiBase] = useState(CANDIDATE_APIS[1]);

  // 1. Default Theme Set to LIGHT
  const [theme, setTheme] = useState(() => localStorage.getItem('hm_theme_v2') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hm_theme_v2', theme);
  }, [theme]);

  // 2. Auth & Role-Based Login State
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Active Navigation Page
  const [activePage, setActivePage] = useState('page1_upload');
  const [userSubTab, setUserSubTab] = useState('upload'); // 'upload' or 'saved'
  const [designerSubTab, setDesignerSubTab] = useState('Fabrics');

  // Persistent Local Storage + Backend State
  const [fabrics, setFabrics] = useState(() => {
    try {
      const local = JSON.parse(localStorage.getItem('hm_fabrics') || 'null');
      return local && local.length > 0 ? local : INITIAL_SEED_FABRICS;
    } catch {
      return INITIAL_SEED_FABRICS;
    }
  });

  const [requests, setRequests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hm_requests') || '[]');
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hm_notifications') || '[]');
    } catch {
      return [];
    }
  });

  const [usersList, setUsersList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hm_users_list') || 'null');
      return saved || [
        { id: 1, username: 'admin', password: '123456', role: 'Super Admin' },
        { id: 2, username: 'hod', password: '123456', role: 'HOD' },
        { id: 3, username: 'designer', password: '123456', role: 'Designer' },
        { id: 4, username: 'user', password: '123456', role: 'User' }
      ];
    } catch {
      return [];
    }
  });

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [statusBanner, setStatusBanner] = useState('');
  const [cardImageIndex, setCardImageIndex] = useState({});

  // Sync local states to localStorage
  const saveLocalFabrics = (list) => {
    setFabrics(list);
    try {
      localStorage.setItem('hm_fabrics', JSON.stringify(list));
    } catch (e) {
      console.warn('Storage quota:', e);
    }
  };

  const saveLocalRequests = (list) => {
    setRequests(list);
    localStorage.setItem('hm_requests', JSON.stringify(list));
  };

  const pushLocalNotification = (targetRole, message, fabricId = null) => {
    const newNotif = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      target_role: targetRole,
      message,
      related_fabric_id: fabricId,
      is_read: false,
      created_at: new Date().toISOString()
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    localStorage.setItem('hm_notifications', JSON.stringify(updated));
  };

  // 3. Interactive Zoom & Mouse-Swipe Viewer Modal State
  const [viewerModal, setViewerModal] = useState({
    open: false,
    images: [],
    currentIndex: 0,
    title: ''
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSwipingVolumeZoom, setIsSwipingVolumeZoom] = useState(false);
  const volumeBarRef = useRef(null);

  // Page 1: User Fabric Upload State (13 Fields)
  const [uploadForm, setUploadForm] = useState({
    supplier: 'Sochers',
    supplier_no: '',
    contain: '100% Egyptian Cotton',
    gsm: '180',
    article_no: '',
    fabric_category: 'Shirting',
    wear_type: 'Formal Wear',
    design_weave: 'Twill Weave',
    fabric_designer: '',
    item_family: 'Envoy Luxury Shirts',
    color_code: '',
    concept_code: '',
    width: '58"',
    total_fabric: 250,
    current_season: 'December Christmas',
    next_season_target: 'Ramadhan March'
  });

  // Default 3 Image Boxes + Extra Images Array (After 3rd Box)
  const [defaultThreeFiles, setDefaultThreeFiles] = useState([null, null, null]);
  const [defaultThreePreviews, setDefaultThreePreviews] = useState([null, null, null]);
  const [extraFiles, setExtraFiles] = useState([]);
  const [extraPreviews, setExtraPreviews] = useState([]);

  // Page 2: Designer 5 Filters
  const [filters, setFilters] = useState({
    fabric_category: '',
    wear_type: '',
    gsm: '',
    color_code: '',
    contain: ''
  });

  // Page 3: Designer Consumption & 10+ Sample Upload State
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [consumption, setConsumption] = useState(1.5);
  const [estimateQty, setEstimateQty] = useState(60);
  const [designerRemarks, setDesignerRemarks] = useState('');
  const [sampleFiles, setSampleFiles] = useState([]);
  const [samplePreviews, setSamplePreviews] = useState([]);

  // Page 4: HOD Remarks Map
  const [hodRemarksMap, setHodRemarksMap] = useState({});

  // Super Admin Create User State
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Designer' });

  const currentRole = authUser?.role || 'User';

  // Auto-detect working PHP backend URL on mount
  useEffect(() => {
    (async () => {
      for (const base of CANDIDATE_APIS) {
        try {
          const res = await fetch(`${base}/get_fabrics.php`, { method: 'GET' });
          if (res.ok) {
            const json = await res.json();
            if (json && json.status === 'success') {
              setApiBase(base);
              if (json.data && json.data.length > 0) {
                saveLocalFabrics(json.data);
              }
              break;
            }
          }
        } catch {
          // Try next candidate
        }
      }
    })();
  }, []);

  const goToHomePage = (roleToUse = currentRole) => {
    setShowNotifDropdown(false);
    if (roleToUse === 'User') {
      setActivePage('page1_upload');
      setUserSubTab('upload');
    } else if (roleToUse === 'Designer') {
      setActivePage('page2_designer');
      setDesignerSubTab('Fabrics');
    } else if (roleToUse === 'HOD') setActivePage('page4_hod');
    else if (roleToUse === 'Super Admin') setActivePage('page1_upload');
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${apiBase}/api_requests.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setAuthUser(json.user);
        localStorage.setItem('hm_user', JSON.stringify(json.user));
        goToHomePage(json.user.role);
        setStatusBanner(json.message);
        setTimeout(() => setStatusBanner(''), 4000);
        return;
      }
    } catch {
      // Check against local usersList
    }

    const matched = usersList.find(
      (u) =>
        u.username.toLowerCase() === loginForm.username.trim().toLowerCase() &&
        u.password === loginForm.password.trim()
    );
    if (matched) {
      setAuthUser(matched);
      localStorage.setItem('hm_user', JSON.stringify(matched));
      goToHomePage(matched.role);
      setStatusBanner(`Welcome back, ${matched.username} (${matched.role})!`);
      setTimeout(() => setStatusBanner(''), 4000);
    } else {
      setLoginError('Invalid username or password. Try admin / 123456');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hm_user');
    setAuthUser(null);
    setLoginForm({ username: '', password: '' });
  };

  // Filtered Fabrics for Designer Hub
  const filteredFabrics = fabrics.filter((f) => {
    if (filters.fabric_category && !String(f.fabric_category || '').toLowerCase().includes(filters.fabric_category.toLowerCase())) return false;
    if (filters.wear_type && !String(f.wear_type || '').toLowerCase().includes(filters.wear_type.toLowerCase())) return false;
    if (filters.gsm && !String(f.gsm || '').includes(filters.gsm)) return false;
    if (filters.color_code && !String(f.color_code || '').toLowerCase().includes(filters.color_code.toLowerCase())) return false;
    if (filters.contain && !String(f.contain || '').toLowerCase().includes(filters.contain.toLowerCase())) return false;
    return true;
  });

  // Role-filtered notifications
  const roleNotifications = notifications.filter(
    (n) => currentRole === 'Super Admin' || currentRole === 'HOD' || n.target_role === currentRole || n.target_role === 'All'
  );
  const unreadCount = roleNotifications.filter((n) => !n.is_read || n.is_read === 'f').length;

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, is_read: true }));
    setNotifications(updated);
    localStorage.setItem('hm_notifications', JSON.stringify(updated));
    fetch(`${apiBase}/api_requests.php?action=mark_notifications_read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: currentRole })
    }).catch(() => {});
  };

  const resolveImgUrl = (path) => {
    if (!path) return 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80';
    if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
    return `${apiBase}/${path}`;
  };

  const openImageInspector = (imagesArray, startIndex = 0, title = 'Fabric Inspector') => {
    const validList = imagesArray && imagesArray.length > 0
      ? imagesArray.map(resolveImgUrl)
      : [resolveImgUrl(null)];
    setViewerModal({
      open: true,
      images: validList,
      currentIndex: startIndex,
      title
    });
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const updateZoomFromVolumeSwipe = (clientX) => {
    if (!volumeBarRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newZoom = +(0.5 + ratio * 4.5).toFixed(2);
    setZoomLevel(newZoom);
  };

  // Handle Default 3 Image Boxes (Box 1, Box 2, Box 3)
  const handleDefaultSlotChange = (index, file) => {
    if (!file) return;
    const updatedFiles = [...defaultThreeFiles];
    updatedFiles[index] = file;
    setDefaultThreeFiles(updatedFiles);

    const updatedPreviews = [...defaultThreePreviews];
    updatedPreviews[index] = URL.createObjectURL(file);
    setDefaultThreePreviews(updatedPreviews);
  };

  const clearDefaultSlot = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const updatedFiles = [...defaultThreeFiles];
    updatedFiles[index] = null;
    setDefaultThreeFiles(updatedFiles);

    const updatedPreviews = [...defaultThreePreviews];
    updatedPreviews[index] = null;
    setDefaultThreePreviews(updatedPreviews);
  };

  // Handle 4th Box ("+ Add More Images 10+")
  const handleAddMoreFabricImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setExtraFiles((prev) => [...prev, ...files]);
    setExtraPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeExtraImage = (idx, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExtraFiles((prev) => prev.filter((_, i) => i !== idx));
    setExtraPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const allSelectedPreviews = [
    ...defaultThreePreviews.filter(Boolean),
    ...extraPreviews
  ];

  // Submit Page 1 (Save or Order Fabric) — Works with PHP Backend AND Local Fallback!
  const handleFabricSubmit = async (actionType) => {
    if (!uploadForm.supplier || !uploadForm.article_no) {
      alert('Please fill at least Supplier and Article No.');
      return;
    }

    const formData = new FormData();
    Object.entries(uploadForm).forEach(([k, v]) => formData.append(k, v));
    formData.append('action_type', actionType);
    formData.append('uploaded_by', authUser?.username || 'user');

    defaultThreeFiles.forEach((f, i) => {
      if (f) formData.append(`image${i + 1}`, f);
    });
    extraFiles.forEach((file) => formData.append('images[]', file));

    let savedOnServer = false;
    try {
      const res = await fetch(`${apiBase}/upload_fabric.php`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          savedOnServer = true;
          setStatusBanner(json.message);
          const listRes = await fetch(`${apiBase}/get_fabrics.php`);
          const listJson = await listRes.json();
          if (listJson.status === 'success') saveLocalFabrics(listJson.data);
        }
      }
    } catch {
      // Backend unreachable -> Save directly in Local Persistent Store so User never gets "Failed to fetch"
    }

    if (!savedOnServer) {
      const allFiles = [...defaultThreeFiles.filter(Boolean), ...extraFiles];
      const dataUrls = await Promise.all(allFiles.map(fileToDataUrl));
      const finalImages = dataUrls.filter(Boolean);
      const totalYardage = parseFloat(uploadForm.total_fabric) || 250;
      const perArt = +(totalYardage / 5).toFixed(2);
      const newId = Date.now();

      const newFabricObj = {
        id: newId,
        ...uploadForm,
        total_fabric: totalYardage,
        overall_balance: totalYardage,
        is_ordered: actionType === 'order',
        uploaded_by: authUser?.username || 'user',
        image1: finalImages[0] || null,
        image2: finalImages[1] || null,
        image3: finalImages[2] || null,
        images_list: finalImages,
        articles: ['Article A', 'Article B', 'Article C', 'Article D', 'Article E'].map((code, idx) => ({
          id: newId + idx + 1,
          article_code: code,
          allocated_qty: perArt,
          used_qty: 0,
          balance_qty: perArt
        }))
      };

      const updatedFabrics = [newFabricObj, ...fabrics];
      saveLocalFabrics(updatedFabrics);

      if (actionType === 'order') {
        pushLocalNotification(
          'Designer',
          `📦 New Fabric Ordered by ${authUser?.username || 'user'}! Supplier: ${uploadForm.supplier} | Article: ${uploadForm.article_no} (${totalYardage}m for ${uploadForm.current_season}).`,
          newId
        );
      }

      setStatusBanner(
        actionType === 'order'
          ? '🚀 Fabric Saved & Real-Time Order Notification sent to Designer!'
          : '💾 Fabric Saved Successfully! Showing in Saved Fabrics below.'
      );
    }

    setTimeout(() => setStatusBanner(''), 5000);
    setDefaultThreeFiles([null, null, null]);
    setDefaultThreePreviews([null, null, null]);
    setExtraFiles([]);
    setExtraPreviews([]);
    setUserSubTab('saved');
  };

  // Order an already saved fabric from the User Saved Fabrics list
  const handleOrderExistingFabric = async (fabricId) => {
    const targetFab = fabrics.find((f) => f.id === fabricId);
    try {
      const res = await fetch(`${apiBase}/upload_fabric.php?action=order_existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fabric_id: fabricId })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') {
          setStatusBanner(json.message);
        }
      }
    } catch {
      // Local fallback
    }

    const updated = fabrics.map((f) => (f.id === fabricId ? { ...f, is_ordered: true } : f));
    saveLocalFabrics(updated);
    if (targetFab) {
      pushLocalNotification(
        'Designer',
        `📦 Saved Fabric Ordered! Supplier: ${targetFab.supplier} | Article: ${targetFab.article_no} (${targetFab.total_fabric}m for ${targetFab.current_season}).`,
        fabricId
      );
    }
    setStatusBanner('🚀 Fabric Ordered & Designer Notified in Real-Time!');
    setTimeout(() => setStatusBanner(''), 4000);
  };

  const handleAddSampleImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSampleFiles((prev) => [...prev, ...files]);
    setSamplePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  // Designer Submits Request to HOD
  const handleDesignerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFabric) return;

    const totalReq = +(consumption * estimateQty).toFixed(2);
    const artCode = selectedArticle ? selectedArticle.article_code : selectedFabric.article_no || 'Article A';

    let submittedToServer = false;
    try {
      const formData = new FormData();
      formData.append('fabric_id', selectedFabric.id);
      if (selectedArticle) formData.append('article_id', selectedArticle.id);
      formData.append('article_code', artCode);
      formData.append('designer_name', authUser?.username || 'Designer');
      formData.append('consumption', consumption);
      formData.append('estimate_qty', estimateQty);
      formData.append('designer_remarks', designerRemarks);
      formData.append('season_used', selectedFabric.current_season || 'December Christmas');
      sampleFiles.forEach((file) => formData.append('samples[]', file));

      const res = await fetch(`${apiBase}/api_requests.php?action=submit_request`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success') submittedToServer = true;
      }
    } catch {
      // Fallback below
    }

    const sampleDataUrls = await Promise.all(sampleFiles.map(fileToDataUrl));
    const newReq = {
      id: Date.now(),
      fabric_id: selectedFabric.id,
      article_id: selectedArticle?.id || null,
      article_code: artCode,
      designer_name: authUser?.username || 'Designer',
      consumption,
      estimate_qty: estimateQty,
      total_requested: totalReq,
      designer_remarks: designerRemarks,
      hod_remarks: '',
      status: 'Pending',
      supplier: selectedFabric.supplier,
      main_article_no: selectedFabric.article_no,
      fabric_category: selectedFabric.fabric_category,
      wear_type: selectedFabric.wear_type,
      contain: selectedFabric.contain,
      gsm: selectedFabric.gsm,
      overall_balance: selectedFabric.overall_balance,
      image1: (selectedFabric.images_list && selectedFabric.images_list[0]) || selectedFabric.image1,
      fabric_images_list: selectedFabric.images_list || [selectedFabric.image1],
      samples_list: sampleDataUrls.filter(Boolean)
    };

    saveLocalRequests([newReq, ...requests]);
    pushLocalNotification(
      'HOD',
      `🎨 Designer (${newReq.designer_name}) submitted Request for ${selectedFabric.supplier} (${artCode}): ${consumption}m × ${estimateQty} pcs = ${totalReq}m. Awaiting HOD Approval.`,
      selectedFabric.id
    );

    setStatusBanner('📨 Designer Request & Samples Submitted to HOD!');
    setTimeout(() => setStatusBanner(''), 5000);
    setSampleFiles([]);
    setSamplePreviews([]);
    setDesignerRemarks('');
  };

  // Page 4: HOD Accept / Reject
  const handleHodDecision = async (reqId, decision) => {
    const remarks = hodRemarksMap[reqId] || '';
    const targetReq = requests.find((r) => r.id === reqId);

    try {
      await fetch(`${apiBase}/api_requests.php?action=hod_decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: reqId, decision, hod_remarks: remarks })
      });
    } catch {
      // Local fallback
    }

    const updatedReqs = requests.map((r) =>
      r.id === reqId ? { ...r, status: decision, hod_remarks: remarks } : r
    );
    saveLocalRequests(updatedReqs);

    if (targetReq) {
      if (decision === 'Accepted') {
        // Deduct balance from fabric & sub-article
        const updatedFabs = fabrics.map((f) => {
          if (f.id !== targetReq.fabric_id) return f;
          const updatedArts = (f.articles || []).map((a) => {
            if (a.article_code === targetReq.article_code || a.id === targetReq.article_id) {
              const newUsed = +(parseFloat(a.used_qty || 0) + parseFloat(targetReq.total_requested)).toFixed(2);
              const newBal = Math.max(0, +(parseFloat(a.allocated_qty) - newUsed).toFixed(2));
              return { ...a, used_qty: newUsed, balance_qty: newBal };
            }
            return a;
          });
          const newOverall = Math.max(0, +(parseFloat(f.overall_balance) - parseFloat(targetReq.total_requested)).toFixed(2));
          return { ...f, overall_balance: newOverall, articles: updatedArts };
        });
        saveLocalFabrics(updatedFabs);

        pushLocalNotification(
          'User',
          `✅ HOD ACCEPTED Request #${reqId} for ${targetReq.supplier} (${targetReq.article_code}) — ${targetReq.total_requested}m approved! HOD Remarks: ${remarks || 'Approved'}`,
          targetReq.fabric_id
        );
      } else {
        pushLocalNotification(
          'Designer',
          `❌ HOD REJECTED Request #${reqId} for ${targetReq.supplier} (${targetReq.article_code}). HOD Remarks: ${remarks || 'Rejected'}`,
          targetReq.fabric_id
        );
      }
    }

    setStatusBanner(`Request ${decision} & Real-Time Notification Dispatched!`);
    setTimeout(() => setStatusBanner(''), 5000);
  };

  // Page 5: Seasonal Simulation (50m - 10m = 40m * 5 = 200m for Ramadhan March)
  const runSeasonalSimulation = async (fabricId, usedPerArticle = 10) => {
    try {
      await fetch(`${apiBase}/api_requests.php?action=simulate_christmas_ramadan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fabric_id: fabricId, used_per_article: usedPerArticle })
      });
    } catch {
      // Local calculation
    }

    const updated = fabrics.map((f) => {
      if (f.id !== fabricId) return f;
      const newArts = (f.articles || []).map((a) => {
        const bal = Math.max(0, +(parseFloat(a.allocated_qty) - usedPerArticle).toFixed(2));
        return { ...a, used_qty: usedPerArticle, balance_qty: bal };
      });
      const sumBal = newArts.reduce((acc, a) => acc + parseFloat(a.balance_qty), 0);
      return { ...f, articles: newArts, overall_balance: sumBal };
    });
    saveLocalFabrics(updated);
    setStatusBanner('⚡ Seasonal Balance Updated! Overall Carry-Forward Balance for Ramadhan March: 200m');
    setTimeout(() => setStatusBanner(''), 5000);
  };

  // =========================================================================
  // ROLE-BASED LOGIN PAGE
  // =========================================================================
  if (!authUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '36px 32px', position: 'relative' }}>
          <button
            className="btn-glass"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ position: 'absolute', top: '18px', right: '18px', padding: '6px 12px', fontSize: '0.85rem' }}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '26px' }}>
            <div className="logo-badge" style={{ width: '82px', height: '82px', marginBottom: '14px' }}>
              <img src="/logo.png" alt="Hameedia Logo" onError={(e) => { e.target.src = `${apiBase}/logo.png`; }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', textAlign: 'center' }}>HAMEEDIA MERCHANTIZER</h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--blue-cyan)', marginTop: '4px' }}>
              Role-Based Fabric & Seasonal Management Portal
            </p>
          </div>

          {loginError && (
            <div style={{
              padding: '10px 14px', marginBottom: '16px', borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#dc2626', fontSize: '0.9rem'
            }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Username</label>
              <input
                className="glass-input"
                placeholder="Enter username (e.g. admin, hod, designer, user)"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Password</label>
              <input
                type="password"
                className="glass-input"
                placeholder="Enter password (default: 123456)"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-glass active" style={{ justifyContent: 'center', padding: '12px', fontSize: '1.05rem', marginTop: '6px' }}>
              🔐 Sign In to Portal
            </button>
          </form>

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px', textAlign: 'center' }}>
              Quick Fill Role Credentials (Password: <strong>123456</strong>):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: '👑 Super Admin', u: 'admin' },
                { label: '👔 HOD Approval', u: 'hod' },
                { label: '🎨 Designer', u: 'designer' },
                { label: '🧵 Fabric User', u: 'user' }
              ].map((demo) => (
                <button
                  key={demo.u}
                  type="button"
                  className="btn-glass"
                  style={{ justifyContent: 'center', fontSize: '0.85rem', padding: '7px 10px' }}
                  onClick={() => setLoginForm({ username: demo.u, password: '123456' })}
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '18px 28px' }}>
      {/* TOP HEADER */}
      <header className="glass-panel" style={{ padding: '14px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div className="logo-container" onClick={() => goToHomePage()} title="Click to go to Home Page">
          <div className="logo-badge">
            <img src="/logo.png" alt="Hameedia Logo" onError={(e) => { e.target.src = `${apiBase}/logo.png`; }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: '800', letterSpacing: '0.5px' }}>
              HAMEEDIA MERCHANTIZER
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--blue-cyan)', fontWeight: '700' }}>
              EST 1949 • Fabric & Seasonal Inventory System
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(currentRole === 'User' || currentRole === 'Super Admin' || currentRole === 'HOD') && (
            <>
              <button
                className={`btn-glass ${activePage === 'page1_upload' && userSubTab === 'upload' ? 'active' : ''}`}
                onClick={() => { setActivePage('page1_upload'); setUserSubTab('upload'); }}
              >
                1. Fabric Upload (User)
              </button>
              <button
                className={`btn-glass ${activePage === 'page1_upload' && userSubTab === 'saved' ? 'active' : ''}`}
                onClick={() => { setActivePage('page1_upload'); setUserSubTab('saved'); }}
              >
                📁 Saved Fabrics ({fabrics.length})
              </button>
            </>
          )}
          {(currentRole === 'Designer' || currentRole === 'Super Admin' || currentRole === 'HOD') && (
            <button className={`btn-glass ${activePage === 'page2_designer' || activePage === 'page3_detail' ? 'active' : ''}`} onClick={() => setActivePage('page2_designer')}>
              2 & 3. Designer Hub
            </button>
          )}
          {(currentRole === 'HOD' || currentRole === 'Super Admin') && (
            <button className={`btn-glass ${activePage === 'page4_hod' ? 'active' : ''}`} onClick={() => setActivePage('page4_hod')}>
              4. HOD Approvals ({requests.filter((r) => r.status === 'Pending').length})
            </button>
          )}
          <button className={`btn-glass ${activePage === 'page5_reports' ? 'active' : ''}`} onClick={() => setActivePage('page5_reports')}>
            5. Seasonal Reports
          </button>
          {currentRole === 'Super Admin' && (
            <button className={`btn-glass ${activePage === 'admin_roles' ? 'active' : ''}`} onClick={() => setActivePage('admin_roles')}>
              ⚙️ Manage Users & Roles
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn-glass"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Switch Light / Dark Theme"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          <div className="badge-pill" style={{ padding: '8px 14px', fontSize: '0.88rem' }}>
            👤 {authUser.username} ({authUser.role})
          </div>

          <div style={{ position: 'relative' }}>
            <button
              className="btn-glass"
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                if (!showNotifDropdown) markAllRead();
              }}
              style={{ position: 'relative', padding: '10px 14px' }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#ef4444', color: '#fff', borderRadius: '50%',
                  width: '22px', height: '22px', fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="glass-panel" style={{
                position: 'absolute', right: 0, top: '50px', width: '380px',
                maxHeight: '420px', overflowY: 'auto', padding: '16px', zIndex: 1000
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                  <strong style={{ color: 'var(--blue-cyan)' }}>🔔 {authUser.role} Notifications</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Real-Time</span>
                </div>
                {roleNotifications.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No notifications yet.</p>
                ) : (
                  roleNotifications.map((n) => (
                    <div key={n.id} style={{
                      padding: '10px', marginBottom: '8px', borderRadius: '10px',
                      background: 'rgba(0, 210, 255, 0.08)', borderLeft: '3px solid var(--blue-cyan)',
                      fontSize: '0.88rem'
                    }}>
                      <div>{n.message}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        To: {n.target_role} • {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button className="btn-glass btn-danger" onClick={handleLogout} style={{ padding: '9px 14px' }}>
            🚪 Logout
          </button>
        </div>
      </header>

      {statusBanner && (
        <div className="glass-panel" style={{
          padding: '14px 22px', marginBottom: '20px',
          background: 'rgba(16, 185, 129, 0.22)', borderColor: '#10b981',
          fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>✨ {statusBanner}</span>
          <button onClick={() => setStatusBanner('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* =====================================================================
          1ST PAGE: FABRIC UPLOADING PAGE & SAVED FABRICS PAGE (USER)
      ===================================================================== */}
      {activePage === 'page1_upload' && (
        <div>
          {userSubTab === 'upload' ? (
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.45rem', color: 'var(--blue-cyan)' }}>1st Page: Fabric Uploading Page (User)</h2>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                    Upload 3 default high-quality (~100MB) fabric images or use the 4th box to add 10+ more images. Click any image to Zoom & Swipe.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className="badge-pill">{allSelectedPreviews.length} Images Selected</span>
                  <button className="btn-glass" onClick={() => setUserSubTab('saved')}>
                    📁 View Saved Fabrics ({fabrics.length})
                  </button>
                </div>
              </div>

              {/* DEFAULT 3 IMAGE BOXES + 4TH "+ ADD MORE IMAGES (10+)" BOX */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))', gap: '18px', marginBottom: '26px' }}>
                {[0, 1, 2].map((slotIdx) => (
                  <div key={slotIdx} style={{ position: 'relative' }}>
                    {defaultThreePreviews[slotIdx] ? (
                      <div className="glass-card" style={{ padding: '10px', position: 'relative' }}>
                        <div
                          className="full-image-stage"
                          style={{ height: '155px' }}
                          onClick={() => openImageInspector(allSelectedPreviews, slotIdx, `Image ${slotIdx + 1}`)}
                          title="Click to Zoom In/Out & Swipe"
                        >
                          <img src={defaultThreePreviews[slotIdx]} alt={`Img ${slotIdx + 1}`} />
                          <span className="badge-pill" style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff' }}>
                            🔍 Image {slotIdx + 1} (Zoom)
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-glass btn-danger"
                          onClick={(e) => clearDefaultSlot(slotIdx, e)}
                          style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px 9px', fontSize: '0.75rem' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="upload-box">
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleDefaultSlotChange(slotIdx, e.target.files[0])}
                        />
                        <div style={{ fontSize: '2rem', color: 'var(--blue-cyan)', marginBottom: '4px' }}>＋</div>
                        <div style={{ fontWeight: '700', fontSize: '1rem' }}>+ Add Image {slotIdx + 1}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          High quality ~100MB (img{slotIdx + 1})
                        </div>
                      </label>
                    )}
                  </div>
                ))}

                {/* Render any extra images added after the 3rd box */}
                {extraPreviews.map((src, idx) => (
                  <div key={`extra_${idx}`} className="glass-card" style={{ padding: '10px', position: 'relative' }}>
                    <div
                      className="full-image-stage"
                      style={{ height: '155px' }}
                      onClick={() => openImageInspector(allSelectedPreviews, 3 + idx, `Image ${4 + idx}`)}
                      title="Click to Zoom In/Out & Swipe"
                    >
                      <img src={src} alt={`Extra ${idx + 4}`} />
                      <span className="badge-pill" style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff' }}>
                        🔍 Image {idx + 4} (Zoom)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-glass btn-danger"
                      onClick={(e) => removeExtraImage(idx, e)}
                      style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px 9px', fontSize: '0.75rem' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* 4TH BOX: "+ ADD MORE IMAGES (10+)" */}
                <label className="upload-box" style={{ borderStyle: 'dashed', borderWidth: '2px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleAddMoreFabricImages}
                  />
                  <div style={{ fontSize: '2.1rem', color: 'var(--blue-cyan)', marginBottom: '4px' }}>＋</div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', textAlign: 'center' }}>
                    + Add More Images (10+)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                    Select multiple extra images at once
                  </div>
                </label>
              </div>

              {/* 13 Specification Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>1. Supplier</label>
                    <input className="glass-input" placeholder="e.g. Sochers" value={uploadForm.supplier} onChange={(e) => setUploadForm({ ...uploadForm, supplier: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>2. Supplier No</label>
                    <input className="glass-input" placeholder="e.g. SUP-2026-88" value={uploadForm.supplier_no} onChange={(e) => setUploadForm({ ...uploadForm, supplier_no: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>3. Contain</label>
                    <input className="glass-input" placeholder="e.g. 100% Egyptian Cotton" value={uploadForm.contain} onChange={(e) => setUploadForm({ ...uploadForm, contain: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>4. GSM</label>
                    <input type="number" className="glass-input" placeholder="e.g. 180" value={uploadForm.gsm} onChange={(e) => setUploadForm({ ...uploadForm, gsm: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>5. Article No</label>
                    <input className="glass-input" placeholder="e.g. ART-XMAS-250" value={uploadForm.article_no} onChange={(e) => setUploadForm({ ...uploadForm, article_no: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>6. Fabric Category</label>
                    <select className="glass-select" value={uploadForm.fabric_category} onChange={(e) => setUploadForm({ ...uploadForm, fabric_category: e.target.value })}>
                      {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>7. Wear Type</label>
                    <select className="glass-select" value={uploadForm.wear_type} onChange={(e) => setUploadForm({ ...uploadForm, wear_type: e.target.value })}>
                      {WEAR_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>8. Design Weave</label>
                    <select className="glass-select" value={uploadForm.design_weave} onChange={(e) => setUploadForm({ ...uploadForm, design_weave: e.target.value })}>
                      {WEAVE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>9. Fabric Designer</label>
                    <input className="glass-input" placeholder="e.g. M. Perera" value={uploadForm.fabric_designer} onChange={(e) => setUploadForm({ ...uploadForm, fabric_designer: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>10. Item Family</label>
                    <input className="glass-input" placeholder="e.g. Envoy Luxury Shirts" value={uploadForm.item_family} onChange={(e) => setUploadForm({ ...uploadForm, item_family: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>11. Color Code</label>
                    <input className="glass-input" placeholder="e.g. Royal Blue #104E8B" value={uploadForm.color_code} onChange={(e) => setUploadForm({ ...uploadForm, color_code: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>12. Concept Code</label>
                    <input className="glass-input" placeholder="e.g. XMAS-DEC-2026" value={uploadForm.concept_code} onChange={(e) => setUploadForm({ ...uploadForm, concept_code: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>13. Width</label>
                    <input className="glass-input" placeholder='e.g. 58" / 60"' value={uploadForm.width} onChange={(e) => setUploadForm({ ...uploadForm, width: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.88rem', color: 'var(--blue-cyan)', fontWeight: '700' }}>Total Fabric Yardage (Meters) — Splits into Articles A–E</label>
                  <input type="number" className="glass-input" value={uploadForm.total_fabric} onChange={(e) => setUploadForm({ ...uploadForm, total_fabric: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.88rem', color: 'var(--blue-cyan)', fontWeight: '700' }}>Primary Focus Season</label>
                  <select className="glass-select" value={uploadForm.current_season} onChange={(e) => setUploadForm({ ...uploadForm, current_season: e.target.value })}>
                    {SEASON_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.88rem', color: 'var(--blue-cyan)', fontWeight: '700' }}>Balance Carry-Forward Season</label>
                  <select className="glass-select" value={uploadForm.next_season_target} onChange={(e) => setUploadForm({ ...uploadForm, next_season_target: e.target.value })}>
                    {SEASON_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <button className="btn-glass" style={{ minWidth: '190px', justifyContent: 'center' }} onClick={() => handleFabricSubmit('save')}>
                  💾 Save Fabric
                </button>
                <button className="btn-glass active" style={{ minWidth: '270px', justifyContent: 'center' }} onClick={() => handleFabricSubmit('order')}>
                  🚀 Order Fabric (Notify Designer)
                </button>
              </div>
            </div>
          ) : null}

          {/* SAVED FABRICS SECTION FOR USER */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--blue-cyan)' }}>
                  📁 User Saved & Ordered Fabrics ({fabrics.length})
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  All fabrics saved by User appear here immediately. Click any image to Zoom In/Out & Swipe, or click "Order Fabric" to notify the Designer.
                </p>
              </div>
              {userSubTab === 'saved' && (
                <button className="btn-glass active" onClick={() => setUserSubTab('upload')}>
                  ＋ Upload New Fabric
                </button>
              )}
            </div>

            {fabrics.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No saved fabrics yet. Fill the form above and click "Save Fabric".</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {fabrics.map((fab, idx) => {
                  const imgs = fab.images_list && fab.images_list.length > 0 ? fab.images_list : [fab.image1];
                  const activeIdx = cardImageIndex[fab.id] || 0;
                  const currentImg = imgs[activeIdx] || imgs[0];
                  const isOrdered = fab.is_ordered === true || fab.is_ordered === 't' || fab.is_ordered === '1' || fab.is_ordered === 1;

                  return (
                    <div key={fab.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div
                          className="full-image-stage"
                          onClick={() => openImageInspector(imgs, activeIdx, `${fab.supplier} — ${fab.article_no}`)}
                          title="Click to Zoom In/Out & Swipe"
                        >
                          <img src={resolveImgUrl(currentImg)} alt={fab.article_no} />
                          <span className="badge-pill" style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(4,13,33,0.85)', color: '#fff' }}>
                            #{idx + 1} ({imgs.length} imgs)
                          </span>
                          <span className="badge-pill" style={{
                            position: 'absolute', top: '8px', right: '8px',
                            background: isOrdered ? 'rgba(16,185,129,0.9)' : 'rgba(245,158,11,0.9)', color: '#fff'
                          }}>
                            {isOrdered ? '✓ Ordered' : 'Saved Draft'}
                          </span>
                        </div>

                        {imgs.length > 1 && (
                          <div className="thumb-strip">
                            {imgs.map((imgUrl, i) => (
                              <img
                                key={i}
                                src={resolveImgUrl(imgUrl)}
                                alt="thumb"
                                className={`thumb-item ${activeIdx === i ? 'active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardImageIndex((prev) => ({ ...prev, [fab.id]: i }));
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginTop: '8px', marginBottom: '4px' }}>
                          {fab.supplier} — {fab.article_no}
                        </h3>
                        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          {fab.fabric_category} • {fab.wear_type} • {fab.gsm} GSM
                        </p>
                        <p style={{ fontSize: '0.84rem', color: 'var(--blue-cyan)', marginBottom: '8px' }}>
                          Color: {fab.color_code || '—'} | Designer: {fab.fabric_designer || '—'}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '10px', marginTop: '6px' }}>
                        <div style={{ fontSize: '0.82rem', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total: <strong>{fab.total_fabric}m</strong></span>
                          <span style={{ color: 'var(--success)' }}>Balance: <strong>{fab.overall_balance}m</strong></span>
                        </div>
                        {!isOrdered ? (
                          <button
                            className="btn-glass active"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => handleOrderExistingFabric(fab.id)}
                          >
                            🚀 Order Fabric (Notify Designer)
                          </button>
                        ) : (
                          <button
                            className="btn-glass"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => handleOrderExistingFabric(fab.id)}
                          >
                            🔔 Re-Notify Designer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2ND PAGE: DESIGNER HUB */}
      {activePage === 'page2_designer' && (
        <div>
          <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className={`btn-glass ${designerSubTab === 'Fabrics' ? 'active' : ''}`} onClick={() => setDesignerSubTab('Fabrics')}>
                🧵 Fabric ({filteredFabrics.length})
              </button>
              <button className={`btn-glass ${designerSubTab === 'Orders' ? 'active' : ''}`} onClick={() => setDesignerSubTab('Orders')}>
                📦 Orders ({requests.length})
              </button>
              <button className="btn-glass" onClick={() => setActivePage('page5_reports')}>
                📊 Reports
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
              <select className="glass-select" style={{ width: '175px' }} value={filters.fabric_category} onChange={(e) => setFilters({ ...filters, fabric_category: e.target.value })}>
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="glass-select" style={{ width: '165px' }} value={filters.wear_type} onChange={(e) => setFilters({ ...filters, wear_type: e.target.value })}>
                <option value="">All Wear Types</option>
                {WEAR_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <input className="glass-input" style={{ width: '115px' }} placeholder="GSM..." value={filters.gsm} onChange={(e) => setFilters({ ...filters, gsm: e.target.value })} />
              <input className="glass-input" style={{ width: '145px' }} placeholder="Color Code..." value={filters.color_code} onChange={(e) => setFilters({ ...filters, color_code: e.target.value })} />
              <input className="glass-input" style={{ width: '145px' }} placeholder="Contain..." value={filters.contain} onChange={(e) => setFilters({ ...filters, contain: e.target.value })} />
            </div>
          </div>

          {designerSubTab === 'Fabrics' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))', gap: '20px' }}>
              {filteredFabrics.map((fab, idx) => {
                const imgs = fab.images_list && fab.images_list.length > 0 ? fab.images_list : [fab.image1];
                const activeIdx = cardImageIndex[fab.id] || 0;
                const currentImg = imgs[activeIdx] || imgs[0];

                return (
                  <div key={fab.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div
                        className="full-image-stage"
                        onClick={() => openImageInspector(imgs, activeIdx, `${fab.supplier} — ${fab.article_no}`)}
                        title="Click to Zoom In/Out & Swipe with mouse"
                      >
                        <img src={resolveImgUrl(currentImg)} alt={fab.article_no} />
                        <span className="badge-pill" style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(4,13,33,0.85)', color: '#fff' }}>
                          Fab {idx + 1} ({imgs.length} imgs)
                        </span>
                        <span className="badge-pill" style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(16,185,129,0.9)', color: '#fff' }}>
                          Bal: {fab.overall_balance}m
                        </span>
                        <span className="badge-pill" style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff' }}>
                          🔍 Click to Zoom
                        </span>
                      </div>

                      {imgs.length > 1 && (
                        <div className="thumb-strip">
                          {imgs.map((imgUrl, i) => (
                            <img
                              key={i}
                              src={resolveImgUrl(imgUrl)}
                              alt="thumb"
                              className={`thumb-item ${activeIdx === i ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCardImageIndex((prev) => ({ ...prev, [fab.id]: i }));
                              }}
                            />
                          ))}
                        </div>
                      )}

                      <h3 style={{ fontSize: '1.08rem', fontWeight: '700', marginTop: '8px', marginBottom: '4px' }}>
                        {fab.supplier} — {fab.article_no}
                      </h3>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        {fab.fabric_category} • {fab.wear_type} • {fab.gsm} GSM
                      </p>
                      <p style={{ fontSize: '0.84rem', color: 'var(--blue-cyan)', marginBottom: '10px' }}>
                        {fab.color_code} | {fab.contain}
                      </p>
                    </div>

                    <div>
                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '8px', marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {fab.articles && fab.articles.map((art) => (
                          <span key={art.id} style={{
                            fontSize: '0.74rem', padding: '2px 7px', borderRadius: '6px',
                            background: 'rgba(0, 210, 255, 0.12)', border: '1px solid var(--glass-border)'
                          }}>
                            {art.article_code}: {art.balance_qty}m
                          </span>
                        ))}
                      </div>

                      <button
                        className="btn-glass active"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => {
                          setSelectedFabric(fab);
                          setSelectedArticle(fab.articles && fab.articles[0] ? fab.articles[0] : null);
                          setActivePage('page3_detail');
                        }}
                      >
                        📐 Open Fabric & Request Consumption
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--blue-cyan)' }}>Submitted Designer Orders & HOD Status</h3>
              <div style={{ display: 'grid', gap: '14px' }}>
                {requests.map((r) => (
                  <div key={r.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <strong>Request #{r.id} — {r.supplier} ({r.main_article_no} / {r.article_code})</strong>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Consumption: {r.consumption}m × Qty: {r.estimate_qty} = <strong style={{ color: 'var(--blue-cyan)' }}>{r.total_requested}m</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        Designer Remarks: {r.designer_remarks || '—'} | HOD Remarks: {r.hod_remarks || 'Pending review'}
                      </div>
                    </div>
                    <span className="badge-pill">{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3RD PAGE: DESIGNER FABRIC DETAIL */}
      {activePage === 'page3_detail' && selectedFabric && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <button className="btn-glass" onClick={() => setActivePage('page2_designer')}>
              ← Back to Designer Fabrics Grid
            </button>
            <span className="badge-pill">
              Season: {selectedFabric.current_season} ➔ Carry-Forward: {selectedFabric.next_season_target}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '26px', marginBottom: '26px' }}>
            <div>
              <div
                className="full-image-stage"
                style={{ height: '290px' }}
                onClick={() => openImageInspector(selectedFabric.images_list, cardImageIndex[selectedFabric.id] || 0, `${selectedFabric.supplier} — ${selectedFabric.article_no}`)}
              >
                <img
                  src={resolveImgUrl((selectedFabric.images_list && selectedFabric.images_list[cardImageIndex[selectedFabric.id] || 0]) || selectedFabric.image1)}
                  alt={selectedFabric.article_no}
                />
                <span className="badge-pill" style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.75)', color: '#fff' }}>
                  🔍 Click Image to Zoom & Swipe
                </span>
              </div>

              {selectedFabric.images_list && selectedFabric.images_list.length > 1 && (
                <div className="thumb-strip" style={{ marginTop: '8px' }}>
                  {selectedFabric.images_list.map((imgUrl, i) => (
                    <img
                      key={i}
                      src={resolveImgUrl(imgUrl)}
                      alt="thumb"
                      className={`thumb-item ${(cardImageIndex[selectedFabric.id] || 0) === i ? 'active' : ''}`}
                      onClick={() => setCardImageIndex((prev) => ({ ...prev, [selectedFabric.id]: i }))}
                    />
                  ))}
                </div>
              )}

              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '0.88rem', color: 'var(--blue-cyan)', marginBottom: '8px', fontWeight: '700' }}>
                  Select Sub-Article of {selectedFabric.article_no}:
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {selectedFabric.articles && selectedFabric.articles.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      className={`btn-glass ${selectedArticle?.id === art.id ? 'active' : ''}`}
                      onClick={() => setSelectedArticle(art)}
                      style={{ padding: '8px 14px', fontSize: '0.86rem' }}
                    >
                      {art.article_code} (Alloc: {art.allocated_qty}m | Used: {art.used_qty}m | Bal: {art.balance_qty}m)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ color: 'var(--blue-cyan)', marginBottom: '14px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                Fabric Specifications (Filled by User)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.94rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Supplier:</span> <strong>{selectedFabric.supplier}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Supplier No:</span> <strong>{selectedFabric.supplier_no}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Contain:</span> <strong>{selectedFabric.contain}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>GSM:</span> <strong>{selectedFabric.gsm}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Article No:</span> <strong>{selectedFabric.article_no}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> <strong>{selectedFabric.fabric_category}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Wear Type:</span> <strong>{selectedFabric.wear_type}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Design Weave:</span> <strong>{selectedFabric.design_weave}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Fabric Designer:</span> <strong>{selectedFabric.fabric_designer}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Item Family:</span> <strong>{selectedFabric.item_family}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Color Code:</span> <strong>{selectedFabric.color_code}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Concept Code:</span> <strong>{selectedFabric.concept_code}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Width:</span> <strong>{selectedFabric.width}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Overall Balance:</span> <strong style={{ color: 'var(--success)' }}>{selectedFabric.overall_balance}m / {selectedFabric.total_fabric}m</strong></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleDesignerSubmit} className="glass-card">
            <h3 style={{ color: 'var(--blue-cyan)', marginBottom: '16px' }}>
              Designer Consumption & Multi-Sample Submission
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '22px' }}>
              <div>
                <label style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Requires Fabric Consumption (m) — e.g. 1.5</label>
                <input
                  type="number"
                  step="0.01"
                  className="glass-input"
                  value={consumption}
                  onChange={(e) => setConsumption(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Estimate Production Qty — e.g. 60</label>
                <input
                  type="number"
                  className="glass-input"
                  value={estimateQty}
                  onChange={(e) => setEstimateQty(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.88rem', color: 'var(--blue-cyan)', fontWeight: '700' }}>
                  Total Requested Fabric (Auto-Multiplied)
                </label>
                <div className="glass-input" style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--success)' }}>
                  {(consumption * estimateQty).toFixed(2)} Meters ({consumption} × {estimateQty})
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.92rem', color: 'var(--blue-cyan)', display: 'block', marginBottom: '10px', fontWeight: '700' }}>
                Upload Designer Samples (Supports 10+ Sample Images):
              </label>
              <label className="upload-box" style={{ height: '130px', marginBottom: '14px' }}>
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddSampleImages} />
                <div style={{ fontSize: '1.7rem', color: 'var(--blue-cyan)' }}>＋</div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>+ Add Sample Images (Select Multiple)</div>
              </label>

              {samplePreviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {samplePreviews.map((src, i) => (
                    <div key={i} className="glass-card" style={{ padding: '8px' }}>
                      <div
                        className="full-image-stage"
                        style={{ height: '130px' }}
                        onClick={() => openImageInspector(samplePreviews, i, `Designer Sample #${i + 1}`)}
                      >
                        <img src={src} alt={`Sample ${i + 1}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Remarks (From Designer)
              </label>
              <textarea
                rows="3"
                className="glass-input"
                placeholder="Enter styling notes, Christmas/Ramadan collection allocation remarks..."
                value={designerRemarks}
                onChange={(e) => setDesignerRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-glass active" style={{ padding: '12px 32px', fontSize: '1rem' }}>
                📨 Submit Request to HOD
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4TH PAGE: HOD APPROVAL PAGE */}
      {activePage === 'page4_hod' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--blue-cyan)', marginBottom: '6px' }}>
            4th Page: HOD Approval Page (HOD)
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '22px' }}>
            Click any fabric or sample image to Zoom & Swipe. Accepting notifies the Fabric Uploading User; Rejecting notifies the Designer.
          </p>

          <div style={{ display: 'grid', gap: '22px' }}>
            {requests.length === 0 ? (
              <p>No designer requests submitted yet.</p>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                      <div
                        className="full-image-stage"
                        style={{ width: '110px', height: '95px', flexShrink: 0 }}
                        onClick={() => openImageInspector(req.fabric_images_list, 0, `${req.supplier} — ${req.main_article_no}`)}
                      >
                        <img src={resolveImgUrl(req.image1)} alt="Fabric" />
                      </div>
                      <div>
                        <span className="badge-pill">Request #{req.id} • {req.status}</span>
                        <h3 style={{ fontSize: '1.08rem', marginTop: '6px' }}>{req.supplier} — {req.main_article_no}</h3>
                        <p style={{ fontSize: '0.86rem', color: 'var(--blue-cyan)' }}>Sub-Article: {req.article_code}</p>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Uploaded Designer Samples ({req.samples_list?.length || 0}):
                    </div>
                    <div className="thumb-strip">
                      {req.samples_list && req.samples_list.map((smp, idx) => (
                        <img
                          key={idx}
                          src={resolveImgUrl(smp)}
                          alt="Sample"
                          className="thumb-item"
                          onClick={() => openImageInspector(req.samples_list, idx, `Request #${req.id} Sample #${idx + 1}`)}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Designer:</span> <strong>{req.designer_name}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Category / Wear:</span> <strong>{req.fabric_category} / {req.wear_type}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Contain / GSM:</span> <strong>{req.contain} ({req.gsm} GSM)</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Consumption × Qty:</span> <strong>{req.consumption}m × {req.estimate_qty} pcs</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Total Requested Fabric:</span> <strong style={{ color: 'var(--blue-cyan)', fontSize: '1.05rem' }}>{req.total_requested} Meters</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Remaining Overall Balance:</span> <strong style={{ color: 'var(--success)' }}>{req.overall_balance}m</strong></div>
                    <div style={{ marginTop: '6px', padding: '8px', background: 'rgba(0,210,255,0.06)', borderRadius: '8px' }}>
                      <strong>Designer Remarks:</strong> {req.designer_remarks || 'No remarks provided'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <label style={{ fontSize: '0.88rem', color: 'var(--blue-cyan)', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                        Remarks (From HOD):
                      </label>
                      <textarea
                        rows="3"
                        className="glass-input"
                        placeholder="Add HOD approval/rejection notes..."
                        value={hodRemarksMap[req.id] !== undefined ? hodRemarksMap[req.id] : (req.hod_remarks || '')}
                        onChange={(e) => setHodRemarksMap({ ...hodRemarksMap, [req.id]: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                      <button
                        className="btn-glass btn-danger"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => handleHodDecision(req.id, 'Rejected')}
                      >
                        ✕ Reject (Notify Designer)
                      </button>
                      <button
                        className="btn-glass btn-success"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => handleHodDecision(req.id, 'Accepted')}
                      >
                        ✓ Accept (Notify User)
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5TH PAGE: SEASONAL REPORTS */}
      {activePage === 'page5_reports' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--blue-cyan)', marginBottom: '6px' }}>
            5th Page: Seasonal Fabric Balance & Carry-Forward Reports
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '22px' }}>
            December Christmas Allocation (250m ➔ A, B, C, D, E = 50m each) with 200m Overall Balance Carried Forward to Ramadhan March.
          </p>

          {fabrics.map((fab) => {
            const totalAllocated = fab.articles?.reduce((acc, a) => acc + parseFloat(a.allocated_qty || 0), 0) || fab.total_fabric;
            const totalUsed = fab.articles?.reduce((acc, a) => acc + parseFloat(a.used_qty || 0), 0) || 0;
            const overallBalance = fab.articles?.reduce((acc, a) => acc + parseFloat(a.balance_qty || 0), 0) || fab.overall_balance;

            return (
              <div key={fab.id} className="glass-card" style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem' }}>
                      {fab.supplier} ({fab.article_no}) — Total Fabric: <span style={{ color: 'var(--blue-cyan)' }}>{fab.total_fabric}m</span>
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      Primary Focus: <strong>{fab.current_season}</strong> ➔ Carry-Forward Balance Focus: <strong style={{ color: 'var(--success)' }}>{fab.next_season_target}</strong>
                    </p>
                  </div>
                  <button
                    className="btn-glass"
                    onClick={() => runSeasonalSimulation(fab.id, 10)}
                  >
                    ⚡ Apply Scenario (50m - 10m = 40m × 5 ➔ 200m Balance)
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.94rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--blue-cyan)', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Article Code</th>
                        <th style={{ padding: '10px' }}>Initial Allocation ({fab.current_season})</th>
                        <th style={{ padding: '10px' }}>Used Yardage</th>
                        <th style={{ padding: '10px' }}>Remaining Balance (For {fab.next_season_target})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fab.articles && fab.articles.map((art) => (
                        <tr key={art.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                          <td style={{ padding: '10px', fontWeight: '700' }}>{art.article_code}</td>
                          <td style={{ padding: '10px' }}>{art.allocated_qty} m</td>
                          <td style={{ padding: '10px', color: 'var(--warning)' }}>{art.used_qty} m</td>
                          <td style={{ padding: '10px', color: 'var(--success)', fontWeight: '700' }}>Balance {art.balance_qty} m</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'rgba(0, 210, 255, 0.1)', fontWeight: '800' }}>
                        <td style={{ padding: '12px' }}>OVERALL TOTAL</td>
                        <td style={{ padding: '12px' }}>{Number(totalAllocated).toFixed(2)} m</td>
                        <td style={{ padding: '12px', color: 'var(--warning)' }}>{Number(totalUsed).toFixed(2)} m</td>
                        <td style={{ padding: '12px', color: 'var(--success)', fontSize: '1.05rem' }}>
                          Overall Balance: {Number(overallBalance).toFixed(2)} m ({fab.next_season_target})
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUPER ADMIN PAGE */}
      {activePage === 'admin_roles' && currentRole === 'Super Admin' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h2 style={{ color: 'var(--blue-cyan)', marginBottom: '6px' }}>Super Admin: Create Login Credentials & Roles</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Create usernames and passwords for HOD, Designers, Users, or additional Super Admins.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '22px' }}>
            <div className="glass-card">
              <h3 style={{ marginBottom: '14px', fontSize: '1.08rem', color: 'var(--blue-cyan)' }}>Create New User Login</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Username</label>
                  <input
                    className="glass-input"
                    placeholder="e.g. designer_kamal"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Password</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="Set login password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Assign Role</label>
                  <select
                    className="glass-select"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="Super Admin">Super Admin (All Access + Role Creator)</option>
                    <option value="HOD">HOD (Access All + Approvals)</option>
                    <option value="Designer">Designer (Fabrics, Orders, Samples)</option>
                    <option value="User">User (Fabric Uploading Page)</option>
                  </select>
                </div>
                <button
                  className="btn-glass active"
                  style={{ justifyContent: 'center', marginTop: '6px' }}
                  onClick={async () => {
                    if (!newUser.username || !newUser.password) {
                      alert('Please enter both username and password');
                      return;
                    }
                    try {
                      await fetch(`${apiBase}/api_requests.php?action=create_user`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newUser)
                      });
                    } catch {
                      // Local fallback
                    }
                    const created = { id: Date.now(), ...newUser };
                    const updatedUsers = [...usersList, created];
                    setUsersList(updatedUsers);
                    localStorage.setItem('hm_users_list', JSON.stringify(updatedUsers));
                    setStatusBanner(`Account '${newUser.username}' (${newUser.role}) created!`);
                    setTimeout(() => setStatusBanner(''), 4000);
                    setNewUser({ username: '', password: '', role: 'Designer' });
                  }}
                >
                  ➕ Create Login Account
                </button>
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ marginBottom: '14px', fontSize: '1.08rem', color: 'var(--blue-cyan)' }}>Active User Accounts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {usersList.map((u) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '10px', background: 'rgba(0,210,255,0.06)', border: '1px solid var(--glass-border)' }}>
                    <div>
                      <strong>{u.username}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Password: {u.password}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge-pill">{u.role}</span>
                      {u.username !== 'admin' && (
                        <button
                          className="btn-glass btn-danger"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => {
                            const updated = usersList.filter((item) => item.id !== u.id);
                            setUsersList(updated);
                            localStorage.setItem('hm_users_list', JSON.stringify(updated));
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE ZOOM IN/OUT & VOLUME-STYLE MOUSE SWIPE LIGHTBOX MODAL */}
      {viewerModal.open && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(2, 8, 19, 0.92)',
            backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', padding: '20px', userSelect: 'none'
          }}
          onMouseUp={() => {
            setIsDraggingImg(false);
            setIsSwipingVolumeZoom(false);
          }}
        >
          <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <strong style={{ color: 'var(--blue-cyan)', fontSize: '1.05rem' }}>{viewerModal.title}</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                Image {viewerModal.currentIndex + 1} of {viewerModal.images.length} • Scroll Wheel or Swipe Volume Bar to Zoom, Drag Screen to Pan
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: '700' }}>🔈 Zoom: {Math.round(zoomLevel * 100)}%</span>
              <div
                ref={volumeBarRef}
                className="volume-zoom-bar"
                onMouseDown={(e) => {
                  setIsSwipingVolumeZoom(true);
                  updateZoomFromVolumeSwipe(e.clientX);
                }}
                onMouseMove={(e) => {
                  if (isSwipingVolumeZoom) updateZoomFromVolumeSwipe(e.clientX);
                }}
                title="Swipe left/right like a volume slider to zoom in/out"
              >
                <div
                  className="volume-zoom-fill"
                  style={{ width: `${((zoomLevel - 0.5) / 4.5) * 100}%` }}
                />
              </div>
              <button className="btn-glass" onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }} style={{ padding: '6px 12px' }}>
                Reset
              </button>
              <button className="btn-glass btn-danger" onClick={() => setViewerModal({ ...viewerModal, open: false })} style={{ padding: '6px 14px' }}>
                ✕ Close
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative', cursor: isDraggingImg ? 'grabbing' : 'grab', margin: '14px 0'
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.25 : -0.25;
              setZoomLevel((prev) => Math.max(0.5, Math.min(5, +(prev + delta).toFixed(2))));
            }}
            onMouseDown={(e) => {
              setIsDraggingImg(true);
              setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            }}
            onMouseMove={(e) => {
              if (!isDraggingImg) return;
              setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            }}
          >
            {viewerModal.images.length > 1 && (
              <button
                className="btn-glass"
                style={{ position: 'absolute', left: '20px', zIndex: 10, padding: '14px 18px', fontSize: '1.2rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                  setViewerModal((prev) => ({
                    ...prev,
                    currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
                  }));
                }}
              >
                ◀
              </button>
            )}

            <img
              src={viewerModal.images[viewerModal.currentIndex]}
              alt="Zoomable Fabric"
              draggable={false}
              style={{
                maxHeight: '75vh',
                maxWidth: '85vw',
                objectFit: 'contain',
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transition: isDraggingImg ? 'none' : 'transform 0.1s ease-out',
                borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
              }}
            />

            {viewerModal.images.length > 1 && (
              <button
                className="btn-glass"
                style={{ position: 'absolute', right: '20px', zIndex: 10, padding: '14px 18px', fontSize: '1.2rem' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                  setViewerModal((prev) => ({
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.images.length
                  }));
                }}
              >
                ▶
              </button>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '10px 18px', display: 'flex', justifyContent: 'center', gap: '10px', overflowX: 'auto' }}>
            {viewerModal.images.map((imgSrc, i) => (
              <img
                key={i}
                src={imgSrc}
                alt={`Slide ${i + 1}`}
                className={`thumb-item ${viewerModal.currentIndex === i ? 'active' : ''}`}
                onClick={() => {
                  setViewerModal((prev) => ({ ...prev, currentIndex: i }));
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}