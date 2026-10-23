import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/get_fabrics.php';
const REQUEST_URL = 'http://localhost:8080/api_requests.php';

const DesignerDashboard = () => {
  const [fabrics, setFabrics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [consumption, setConsumption] = useState(1.5);
  const [qty, setQty] = useState(60);
  const [remarks, setRemarks] = useState('');

    useEffect(() => {
    fetchFabrics();
  }, []);

    const fetchFabrics = async () => {
    try {
      const res = await axios.get(API_URL);
      console.log("FABRICS DATA:", res.data); // Check this in F12 Console!
      setFabrics(res.data);
    } catch (error) {
      console.error("Failed to fetch fabrics", error);
    }
  };

  const handleRequest = async () => {
    if (!selected) return;
    try {
      await axios.post(REQUEST_URL, {
        fabricId: selected.Id,
        designerName: 'Marcus Sterling',
        consumptionPerGarment: parseFloat(consumption),
        estimatedQty: parseInt(qty),
        designerRemarks: remarks
      });
      alert('Request sent to HOD successfully!');
      setSelected(null);
      setRemarks('');
    } catch (err) { 
      alert(err.response?.data || 'Error sending request'); 
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Fabric List */}
      <div className="md:col-span-1 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
        <h2 className="text-xl font-bold text-sky-800 sticky top-0 bg-white/80 backdrop-blur-md py-2 z-10 rounded-lg px-2">Available Fabrics</h2>
        {fabrics.map(f => (
          <div key={f.Id} onClick={() => setSelected(f)} 
            className={`p-4 rounded-xl cursor-pointer transition-all border ${selected?.Id === f.Id ? 'bg-sky-100 border-sky-400 shadow-md' : 'glass-card hover:bg-white/80'}`}>
            {f.ImageUrl ? (
               <img src={`http://localhost:8080${f.ImageUrl}`} alt="fabric" className="h-32 w-full object-cover rounded-lg mb-3 shadow-sm"/>
            ) : (
               <div className="h-32 w-full bg-slate-200 rounded-lg mb-3 flex items-center justify-center text-slate-400">No Image</div>
            )}
            <h3 className="font-bold text-slate-800">{f.ArticleNo}</h3>
            <p className="text-sm text-slate-600">{f.Supplier}</p>
            <div className="flex justify-between mt-2 text-xs font-semibold">
              <span className="text-sky-700">{f.GSM} GSM</span>
              <span className={f.AvailableMeters > 0 ? "text-green-600" : "text-red-600"}>
                {f.AvailableMeters} m Available
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Fabric Detail & Request Form */}
      <div className="md:col-span-2">
        {selected ? (
          <div className="glass-card p-8 sticky top-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-sky-900">{selected.ArticleNo}</h2>
                <p className="text-slate-600">{selected.Supplier} • {selected.WearType}</p>
              </div>
              <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-sm font-bold border border-sky-200">
                {selected.AvailableMeters} m Left
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div><span className="text-slate-500">Composition:</span> <br/><span className="font-semibold">{selected.DesignWeave}</span></div>
              <div><span className="text-slate-500">Color:</span> <br/><span className="font-semibold">{selected.ColorCode}</span></div>
              <div><span className="text-slate-500">Width:</span> <br/><span className="font-semibold">{selected.Width}</span></div>
              <div><span className="text-slate-500">Category:</span> <br/><span className="font-semibold">{selected.FabricCategory}</span></div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-sky-800 mb-4">Create Production Request</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Consumption per Garment (m)</label>
                  <input type="number" step="0.1" value={consumption} onChange={e => setConsumption(e.target.value)} 
                    className="w-full p-3 rounded-lg bg-white/60 border border-white/50 focus:outline-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Quantity</label>
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)} 
                    className="w-full p-3 rounded-lg bg-white/60 border border-white/50 focus:outline-sky-500" />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Designer Remarks</label>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows="2" placeholder="e.g. Urgent for Christmas collection..."
                  className="w-full p-3 rounded-lg bg-white/60 border border-white/50 focus:outline-sky-500"></textarea>
              </div>

              <div className="flex justify-between items-center bg-sky-50 p-4 rounded-lg border border-sky-100 mb-6">
                <span className="font-semibold text-slate-700">Total Requested Fabric:</span>
                <span className="text-2xl font-bold text-sky-700">{(consumption * qty).toFixed(2)} m</span>
              </div>

              <button onClick={handleRequest} 
                className="w-full bg-sky-600 text-white font-bold py-3 rounded-lg hover:bg-sky-700 transition shadow-lg flex justify-center items-center gap-2">
                <span>Order Fabric & Notify HOD</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 text-center h-full flex flex-col items-center justify-center">
            <svg className="w-24 h-24 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <h2 className="text-xl font-bold text-slate-600">Select a fabric to view details and create a request</h2>
          </div>
        )}
      </div>
    </div>
  );
};
export default DesignerDashboard;