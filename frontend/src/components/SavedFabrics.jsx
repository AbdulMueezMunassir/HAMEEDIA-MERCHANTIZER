import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/get_fabrics.php';

const SavedFabrics = () => {
  const [fabrics, setFabrics] = useState([]);

  useEffect(() => {
    fetchFabrics();
  }, []);

  const fetchFabrics = async () => {
    try {
      const res = await axios.get(API_URL);
      setFabrics(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="glass-card p-8 w-full max-w-[1400px] mx-auto shadow-2xl">
      <div className="flex justify-between items-center mb-8 border-b border-white/40 pb-4">
        <h2 className="text-3xl font-bold text-sky-900">Saved Fabrics Directory</h2>
        <span className="bg-sky-100 text-sky-800 px-4 py-1.5 rounded-full font-bold shadow-sm border border-sky-200">
          {fabrics.length} Fabrics Uploaded
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white/50 border border-white/60 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-sky-50/80 text-sky-900 font-bold text-sm uppercase tracking-wider">
              <th className="p-4 border-b border-white/60">Image</th>
              <th className="p-4 border-b border-white/60">Article No</th>
              <th className="p-4 border-b border-white/60">Supplier</th>
              <th className="p-4 border-b border-white/60">GSM / Width</th>
              <th className="p-4 border-b border-white/60">Total Stock</th>
              <th className="p-4 border-b border-white/60 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fabrics.map(fabric => (
              <tr key={fabric.Id} className="hover:bg-white/80 transition-colors border-b border-white/40">
                <td className="p-4">
                  {fabric.ImageUrl ? (
                    <img src={`http://localhost:8080${fabric.ImageUrl}`} alt="Fabric" className="w-16 h-16 object-cover rounded-lg shadow-sm border border-white" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">No Img</div>
                  )}
                </td>
                <td className="p-4 font-bold text-sky-800">{fabric.ArticleNo}</td>
                <td className="p-4 text-slate-700">{fabric.Supplier} <br/><span className="text-xs text-slate-500">#{fabric.SupplierNo}</span></td>
                <td className="p-4 text-slate-700">{fabric.GSM} GSM <br/><span className="text-xs text-slate-500">{fabric.Width} in</span></td>
                <td className="p-4 font-bold text-green-600">{fabric.AvailableMeters} m</td>
                <td className="p-4 text-right">
                  <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors shadow-sm">
                    Edit Details
                  </button>
                </td>
              </tr>
            ))}
            {fabrics.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">No fabrics uploaded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SavedFabrics;