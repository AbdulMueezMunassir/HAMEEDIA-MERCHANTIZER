import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/upload_fabric.php';

const UploadFabric = () => {
  const [formData, setFormData] = useState({
    supplier: '', supplierNo: '', articleNo: '', gsm: '', 
    fabricCategory: '', wearType: '', designWeave: '', designerName: '',
    itemFamily: '', colorCode: '', conceptCode: '', width: '', totalMeters: 0
  });
  
  const [images, setImages] = useState([null, null, null]); // Start with 3
  const [loading, setLoading] = useState(false);
  
  // Zoom state
  const [zoomImage, setZoomImage] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageChange = (index, file) => {
    const newImages = [...images];
    newImages[index] = file;
    setImages(newImages);
  };

  const addImageSlot = () => {
    if (images.length < 10) {
      setImages([...images, null]);
    } else {
      alert("Maximum 10 images allowed.");
    }
  };

  const removeImageSlot = (index) => {
    const newImages = [...images];
    newImages[index] = null; // Just clear the file, keep the slot
    setImages(newImages);
  };

  const openZoom = (file) => {
    setZoomImage(URL.createObjectURL(file));
    setZoomScale(1); // Reset zoom
  };

  const handleSubmit = async (e, actionType) => {
    e.preventDefault();
    setLoading(true);
    const data = new FormData();
    
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    
    // Append only non-null images
    images.forEach((img, idx) => {
        if (img) data.append(`image${idx}`, img);
    });
    data.append('actionType', actionType); 

    try {
      await axios.post(API_URL, data);
      alert(`Fabric ${actionType === 'save' ? 'saved' : 'ordered'} successfully!`);
      setFormData({ supplier: '', supplierNo: '', articleNo: '', gsm: '', fabricCategory: '', wearType: '', designWeave: '', designerName: '', itemFamily: '', colorCode: '', conceptCode: '', width: '', totalMeters: 0 });
      setImages([null, null, null]);
    } catch (err) { 
      alert('Error processing fabric'); 
      console.error(err);
    } finally { setLoading(false); }
  };

  const inputClass = "flex-1 p-2.5 rounded-lg bg-white/90 border border-slate-300 shadow-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all";
  const labelClass = "w-36 text-sm font-bold text-slate-700";

  return (
    <div className="glass-card p-8 w-full max-w-[1400px] mx-auto shadow-2xl relative">
      <h2 className="text-3xl font-bold mb-8 text-sky-900 border-b border-white/40 pb-4">Upload New Fabric</h2>
      
      {/* ZOOM MODAL */}
      {zoomImage && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center">
            <div className="flex gap-4 mb-4 bg-white/10 p-2 rounded-xl">
              <button onClick={() => setZoomScale(prev => Math.min(prev + 0.2, 3))} className="px-4 py-2 bg-white text-slate-800 font-bold rounded-lg shadow">Zoom In +</button>
              <button onClick={() => setZoomScale(prev => Math.max(prev - 0.2, 0.5))} className="px-4 py-2 bg-white text-slate-800 font-bold rounded-lg shadow">Zoom Out -</button>
              <button onClick={() => setZoomImage(null)} className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow">Close ✕</button>
            </div>
            <div className="overflow-hidden w-full h-[75vh] flex items-center justify-center bg-black/50 rounded-xl border border-white/20">
               <img src={zoomImage} alt="Zoomed" style={{ transform: `scale(${zoomScale})` }} className="max-h-full max-w-full transition-transform duration-200 object-contain" />
            </div>
          </div>
        </div>
      )}

      <form className="flex flex-col gap-8">
        
        {/* IMAGE GALLERY GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, idx) => (
                <div key={idx} className="relative h-40 rounded-xl border-2 border-dashed border-sky-300 bg-white/40 flex flex-col items-center justify-center overflow-hidden hover:bg-white/60 transition-all group">
                    {img ? (
                        <>
                           <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover cursor-pointer" onClick={() => openZoom(img)} />
                           <button type="button" onClick={() => removeImageSlot(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                           <div className="absolute bottom-0 w-full bg-black/50 text-white text-[10px] text-center py-1 opacity-0 group-hover:opacity-100">Click to Zoom</div>
                        </>
                    ) : (
                        <>
                           <svg className="w-10 h-10 text-sky-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                           <span className="text-xs text-sky-600 font-semibold mb-1">Image {idx + 1}</span>
                           <input type="file" accept="image/*" onChange={(e) => handleImageChange(idx, e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </>
                    )}
                </div>
            ))}
            {/* Add Image Button */}
            <div onClick={addImageSlot} className="h-40 rounded-xl border-2 border-solid border-sky-200 bg-sky-50/50 flex flex-col items-center justify-center hover:bg-sky-100/50 transition-all cursor-pointer">
                <span className="text-3xl text-sky-500 mb-1">+</span>
                <span className="text-sm text-sky-700 font-bold">Add More</span>
                <span className="text-[10px] text-sky-600">({images.length}/10)</span>
            </div>
        </div>

        {/* FORM FIELDS (Same as before) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3"><label className={labelClass}>1. Supplier</label><input name="supplier" value={formData.supplier} onChange={handleChange} required className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>2. Supplier No</label><input name="supplierNo" value={formData.supplierNo} onChange={handleChange} className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>3. Contain</label><input name="conceptCode" placeholder="e.g. 96% Cotton" value={formData.conceptCode} onChange={handleChange} className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>4. GSM</label><input name="gsm" value={formData.gsm} onChange={handleChange} className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>5. Article No</label><input name="articleNo" value={formData.articleNo} onChange={handleChange} required className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>6. Fabric Category</label><input name="fabricCategory" value={formData.fabricCategory} onChange={handleChange} className={inputClass} /></div>
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3"><label className={labelClass}>7. Wear Type</label><input name="wearType" value={formData.wearType} onChange={handleChange} className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>8. Design Weave</label><input name="designWeave" value={formData.designWeave} onChange={handleChange} className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>9. Fabric Designer</label><input name="designerName" value={formData.designerName} onChange={handleChange} className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>10. Item Family</label><input name="itemFamily" value={formData.itemFamily} onChange={handleChange} className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>11. Color Code</label><input name="colorCode" value={formData.colorCode} onChange={handleChange} className={inputClass} /></div>
                <div className="flex items-center gap-3"><label className={labelClass}>12. Width</label><input name="width" value={formData.width} onChange={handleChange} className={inputClass} /></div>
            </div>
        </div>

        {/* QUANTITY & BUTTONS */}
        <div className="flex flex-col md:flex-row justify-between items-end border-t border-white/40 pt-6 mt-2 gap-4">
             <div className="flex items-center gap-3 w-full md:w-1/2">
                 <label className={labelClass}>Total Stock</label>
                 <div className="relative flex-1">
                    <input name="totalMeters" type="number" step="0.01" value={formData.totalMeters} onChange={handleChange} required className={`${inputClass} font-bold text-lg`} />
                
                 </div>
             </div>
             <div className="flex gap-4">
                <button type="button" onClick={(e) => handleSubmit(e, 'save')} disabled={loading} className="px-6 py-3 rounded-xl bg-white/80 border-2 border-sky-600 text-sky-700 font-bold text-lg hover:bg-sky-50 hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-sm">Save Fabric</button>
                <button type="button" onClick={(e) => handleSubmit(e, 'order')} disabled={loading} className="px-8 py-3 rounded-xl bg-sky-600 text-white font-bold text-lg shadow-lg shadow-sky-500/30 hover:bg-sky-700 hover:-translate-y-0.5 transition-all disabled:opacity-50">{loading ? 'Processing...' : 'Order Fabric'}</button>
             </div>
        </div>
      </form>
    </div>
  );
};

export default UploadFabric;