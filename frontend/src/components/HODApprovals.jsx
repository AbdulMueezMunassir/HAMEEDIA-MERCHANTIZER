import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api_requests.php';

const HODApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(API_URL);
      setRequests(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.put(API_URL, {
        id: id,
        action: action,
        remarks: remarks[id] || 'Approved by HOD'
      });
      alert(`Request ${action}d successfully`);
      fetchRequests();
    } catch (err) { alert('Error processing request'); }
  };

  if (loading) return <div className="text-center p-12">Loading requests...</div>;

  return (
    <div className="glass-card p-8">
      <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-sky-800">HOD Approval Dashboard</h2>
          <p className="text-slate-500">Review and approve designer fabric requests</p>
        </div>
        <div className="bg-sky-100 text-sky-800 px-4 py-2 rounded-lg font-bold border border-sky-200">
          {requests.filter(r => r.Status === 'Pending').length} Pending Requests
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No requests found.</div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.Id} className={`p-6 rounded-xl border transition-all ${req.Status === 'Pending' ? 'bg-white/80 border-sky-200 shadow-md' : 'bg-slate-50/50 border-slate-200 opacity-70'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-slate-800">Request #{req.Id}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      req.Status === 'Pending' ? 'bg-amber-100 text-amber-800' : 
                      req.Status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {req.Status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">Requested by <span className="font-semibold text-slate-700">{req.DesignerName}</span> on {new Date(req.CreatedAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-sky-700">{req.TotalRequestedMeters} m</p>
                  <p className="text-xs text-slate-500">Total Requested</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-slate-500 block text-xs">Article No</span> <span className="font-bold">{req.ArticleNo}</span></div>
                <div><span className="text-slate-500 block text-xs">Consumption/Garment</span> <span className="font-bold">{req.ConsumptionPerGarment} m</span></div>
                <div><span className="text-slate-500 block text-xs">Estimated Qty</span> <span className="font-bold">{req.EstimatedQty} units</span></div>
                <div><span className="text-slate-500 block text-xs">Current Stock</span> <span className="font-bold text-sky-700">{req.AvailableMeters ?? '—'} {req.AvailableMeters != null ? 'm' : ''}</span></div>
              </div>

              {req.DesignerRemarks && (
                <div className="mb-4 bg-amber-50 p-3 rounded-lg border border-amber-100 text-sm">
                  <span className="font-bold text-amber-800">Designer Remarks:</span> {req.DesignerRemarks}
                </div>
              )}

              {req.Status === 'Pending' ? (
                <div className="flex flex-col md:flex-row gap-4 items-end border-t border-slate-200 pt-4">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-600 mb-1">HOD Remarks (Optional)</label>
                    <input type="text" placeholder="Add approval notes..." value={remarks[req.Id] || ''} onChange={(e) => setRemarks({...remarks, [req.Id]: e.target.value})}
                      className="w-full p-2 rounded-lg bg-white border border-slate-300 focus:outline-sky-500 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(req.Id, 'reject')} className="px-6 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition">
                      Reject
                    </button>
                    <button onClick={() => handleAction(req.Id, 'approve')} className="px-6 py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition shadow-md">
                      Approve
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 italic border-t border-slate-200 pt-3">
                  {req.Status === 'Approved' ? 'Approved' : 'Rejected'} with remarks: "{req.HODRemarks}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default HODApprovals;