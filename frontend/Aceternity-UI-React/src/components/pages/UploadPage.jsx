import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Trash2, Upload, FileText, Check, Target, BookOpen, Loader2, AlertCircle, ListChecks, PenLine } from 'lucide-react';
import API_BASE_URL from '../../config/api';

// Moved outside UploadPage so it isn't recreated (and doesn't remount its children) on every render.
const SectionCard = ({ badge, title, subtitle, icon, children }) => (
  <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6">
    <div className="flex items-center gap-3 mb-4">
      {badge && <span className="px-3 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-lg">{badge}</span>}
      {icon && icon}
      <div>
        <h2 className="text-white font-bold text-lg">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const UploadPage = () => {
  const [formData, setFormData] = useState({
    "College Name": "",
    "Field": "",
    "Branch": "",
    "Year Of Study": "",
    "Semester": "",
    "Course Name": "",
    "Course Code": "",
    "Course Teacher": ""
  });

  const [courseOutcomes, setCourseOutcomes] = useState([]);
  const [modules, setModules] = useState([]);
  const [numCOs, setNumCOs] = useState('');
  const [numModules, setNumModules] = useState('');
  const [file, setFile] = useState(null);
  const [inputMode, setInputMode] = useState('excel'); // 'excel' | 'manual'
  const [numQuestions, setNumQuestions] = useState('');
  const [questions, setQuestions] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // CSS classes
  const labelClass = "block text-gray-300 text-sm font-medium mb-2";
  const inputClass = "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const fieldOptions = ['Engineering', 'Medical', 'Pharmacy', 'Management', 'Science', 'Other'];
  // Helper function
  const getCurrentWeightSum = () => courseOutcomes.reduce((sum, co) => sum + (parseFloat(co.weight) || 0), 0);
  const getQuestionsTotalMarks = () => questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);

  // Validation function
  const validateForm = () => {
    setError('');

    // Check required fields

    const requiredFields = ["College Name", "Field", "Branch", "Course Name", "Course Code"];

    for (let field of requiredFields) {
      if (!formData[field].trim()) { setError(`${field} is required`); return false; }
    }

    // Validate course outcomes
    if (courseOutcomes.length === 0) { setError("At least one course outcome is required"); return false; }

    // Validate course outcomes have required fields
    for (let i = 0; i < courseOutcomes.length; i++) {
      const co = courseOutcomes[i];
      if (!co.weight || parseFloat(co.weight) <= 0) { setError(`Course Outcome ${i + 1} must have a valid weight`); return false; }
      const hasLevel = Boolean(co.cognitive || co.affective || co.psychomotor || co.blooms);
      if (!hasLevel) { setError(`Course Outcome ${i + 1} must have at least one domain level selected (Cognitive, Affective, or Psychomotor)`); return false; }
    }

    // Validate weight sum
    const totalWeight = courseOutcomes.reduce((sum, co) => sum + (parseFloat(co.weight) || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) { setError(`CO weights must sum to 100%. Current: ${totalWeight.toFixed(1)}%`); return false; }

    // Validate modules
    if (modules.length === 0) { setError("At least one module is required"); return false; }
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      if (!module.name.trim()) { setError(`Module ${i + 1} name is required`); return false; }
      if (!module.hours || parseFloat(module.hours) <= 0) { setError(`Module ${i + 1} must have valid teaching hours`); return false; }
    }

    return true;
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const createCO = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    weight: "",
    cognitive: "",
    affective: "",
    psychomotor: "",
    blooms: ""
  });
  const createModule = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, name: "", hours: "" });
  const createQuestion = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, question: "", co: "", marks: "", difficulty: "", module: "" });

  const handleNumCOsChange = (e) => {
    const num = parseInt(e.target.value) || 0;
    setNumCOs(e.target.value);
    if (num > 0 && num <= 20) {
      setCourseOutcomes(Array.from({ length: num }, () => createCO()));
      setError('');
    } else if (num > 20) setError('Maximum 20 course outcomes allowed');
    else setCourseOutcomes([]);
  };

  const handleNumModulesChange = (e) => {
    const num = parseInt(e.target.value) || 0;
    setNumModules(e.target.value);
    if (num > 0 && num <= 20) {
      setModules(Array.from({ length: num }, () => createModule()));
      setError('');
    } else if (num > 20) setError('Maximum 20 modules allowed');
    else setModules([]);
  };

  const deleteCO = (index) => {
    setCourseOutcomes(courseOutcomes.filter((_, i) => i !== index));
  };

  const handleCOChange = (index, field, value) => {
    const updated = [...courseOutcomes];
    updated[index][field] = value;
    setCourseOutcomes(updated);
    setError('');
  };

  const deleteModule = (index) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const handleModuleChange = (index, field, value) => {
    const updated = [...modules];
    updated[index][field] = value;
    setModules(updated);
    setError('');
  };

  const handleNumQuestionsChange = (e) => {
    const num = parseInt(e.target.value) || 0;
    setNumQuestions(e.target.value);
    if (num > 0 && num <= 100) {
      setQuestions(Array.from({ length: num }, () => createQuestion()));
      setError('');
    } else if (num > 100) setError('Maximum 100 questions allowed');
    else setQuestions([]);
  };

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
    setError('');
  };

  const validateQuestions = () => {
    setError('');
    if (questions.length === 0) { setError('Enter the number of questions and fill them in.'); return false; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) { setError(`Question ${i + 1}: question text is required`); return false; }
      if (!q.co) { setError(`Question ${i + 1}: please select a CO`); return false; }
      if (!q.marks || parseFloat(q.marks) <= 0) { setError(`Question ${i + 1}: please enter valid marks`); return false; }
      if (!q.difficulty) { setError(`Question ${i + 1}: please select a difficulty`); return false; }
      if (!q.module) { setError(`Question ${i + 1}: please select a module`); return false; }
    }
    return true;
  };

  const generateExcelFromQuestions = () => {
    const rows = questions.map(q => ({
      Question: q.question.trim(),
      CO: q.co,
      Marks: parseFloat(q.marks),
      Difficulty: q.difficulty,
      Module: q.module
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const generatedFile = new File([blob], `manual_paper_${Date.now()}.xlsx`, { type: blob.type });
    setFile(generatedFile);
    return generatedFile;
  };

  const isValidFileType = (f) =>
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(f.type);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && isValidFileType(f)) { setFile(f); setError(''); }
    else setError('Please upload a valid Excel (.xlsx, .xls) file');
  };
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      if (isValidFileType(f)) { setFile(f); setError(''); }
      else { setError('Please upload a valid Excel (.xlsx, .xls) file'); e.target.value = ''; }
    }
  };

  const handleSubmit = async () => {
    let fileToSubmit = file;

    if (inputMode === 'manual') {
      if (!validateQuestions()) return;
      fileToSubmit = generateExcelFromQuestions();
    } else if (!file) {
      setError("Please upload a file (Excel)!"); return;
    }

    if (!validateForm()) return;
    setIsUploading(true); setError('');

    // Transform course outcomes and modules into backend's expected format
    const transformedSequence = [
      // Add course outcomes with backend structure
      ...courseOutcomes.map((co, index) => {
        const levels = [];
        if (co.cognitive) levels.push(co.cognitive);
        if (co.affective) levels.push(co.affective);
        if (co.psychomotor) levels.push(co.psychomotor);
        if (levels.length === 0 && co.blooms) levels.push(co.blooms);
        return {
          name: `CO${index + 1}`,
          type: "CO",
          weight: parseFloat(co.weight),
          blooms: levels
        };
      }),
      // Add modules with backend structure
      ...modules.map(module => ({ name: module.name, type: "Module", hours: parseFloat(module.hours) }))
    ];

    // Prepare form data to send to the backend
    const formDataToSend = new FormData();
    formDataToSend.append("file", fileToSubmit);
    formDataToSend.append("FormData", JSON.stringify(formData));
    formDataToSend.append("Sequence", JSON.stringify(transformedSequence));

    try {
      const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
      if (!token) throw new Error('No authentication token found. Please login first.');

        const response = await fetch(`${API_BASE_URL}/upload/totext`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      });

      // Check if response is ok first
      if (response.ok) {
        try {
          const responseData = await response.json();
          // Extract the ID from response - adjust based on your backend's response structure
          let resultId;
          if (typeof responseData === 'string') {
            resultId = responseData;
          } else if (responseData.id || responseData._id) {
            resultId = responseData.id || responseData._id;
          } else if (responseData.result_id) {
            resultId = responseData.result_id;
          } else if (responseData.data && (responseData.data.id || responseData.data._id)) {
            resultId = responseData.data.id || responseData.data._id;
          } else if (responseData.results || responseData.overview) {
            resultId = responseData.id || responseData._id || 'success';
          } else {
            resultId = responseData;
          }

          if (resultId) {
            // Success message
            alert('File uploaded and processed successfully!');
            // Redirect to result page using native browser navigation
            window.location.href = '/result';
            // Reset form on success
            setFile(null); setCourseOutcomes([]); setModules([]);
            setFormData({ "College Name": "", "Field": "", "Branch": "", "Year Of Study": "", "Semester": "", "Course Name": "", "Course Code": "", "Course Teacher": "" });
          } else throw new Error('No result ID received from server');
        } catch { setError('Invalid response from server. Please try again.'); }
      } else {
        // Handle error responses
        try {
          const text = await response.text();
          let msg;
          try {
            // Try to parse as JSON first
            const d = JSON.parse(text);
            msg = d.message || d.error || text;
          } catch {
            // If not JSON, use the text directly
            msg = text;
          }
          if (response.status === 403) setError('Access denied. Please check your authentication or login again.');
          else if (response.status === 401) setError('Authentication required. Please login again.');
          else if (response.status === 413) setError('File too large. Please upload a smaller file.');
          else setError(`Upload failed: ${msg}`);
        } catch { setError(`Server error: ${response.status} ${response.statusText}`); }
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) setError('Network error. Please check your connection.');
      else if (!navigator.onLine) setError('No internet connection. Please check your connection.');
      else setError(`Upload failed: ${err.message || 'Unknown error occurred'}`);
    } finally { setIsUploading(false); }
  };

  const downloadSample = () => {
    const csv = [
      ['Question', 'CO', 'Marks', 'Difficulty', 'Module'],
      ["What is the definition of...?", 'CO1', '5', 'Easy', 'Module 1'],
      ["Explain the concept of...?", 'CO2', '10', 'Medium', 'Module 2'],
      ["Analyze the following...?", 'CO3', '15', 'Hard', 'Module 3']
    ].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'sample_paper_format.csv'
    });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const cognitiveLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const affectiveLevels = ['Receiving', 'Responding', 'Valuing', 'Organizing', 'Characterizing'];
  const psychomotorLevels = ['Perception', 'Set', 'Guided Response', 'Mechanism', 'Complex Overt Response', 'Adaptation', 'Origination'];
  const requiredFields = ["College Name", "Branch", "Course Name", "Course Code"];
  const weightSum = getCurrentWeightSum();
  const weightOk = Math.abs(weightSum - 100) <= 0.01;
  const questionsTotalMarks = getQuestionsTotalMarks();

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Subtle top ambient glow only — not overpowering */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Upload size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Upload Paper & Details</h1>
            <p className="text-xs text-gray-400">Fill in all sections, then submit for analysis</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5 relative">

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-900/30 border border-red-500/40 rounded-2xl p-4">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-red-300 font-semibold text-sm">Error</p>
              <p className="text-red-400 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── 1. Course Information ── */}
        <SectionCard badge="1" title="Course Information" subtitle="Basic details about the course and institution">
          <div className="mb-5">
            <label className={labelClass}>
              Field of Study <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {fieldOptions.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFormData({ ...formData, Field: f }); setError(''); }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${formData.Field === f
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-gray-900/60 border-gray-700/60 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {formData.Field ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(formData).filter((key) => key !== 'Field').map((key) => (
                <div key={key}>
                  <label className={labelClass}>
                    {key}
                    {requiredFields.includes(key) && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    name={key}
                    value={formData[key]}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder={`Enter ${key.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-700/50 rounded-2xl bg-gray-700/10">
              <p className="text-gray-400 font-medium text-sm">Select a field of study above to continue</p>
            </div>
          )}
        </SectionCard>

        {/* ── 2. Course Outcomes ── */}
        <SectionCard
          icon={<Target size={16} />}
          title="Course Outcomes"
          subtitle="Define learning objectives with weights and learning domain levels (Cognitive, Affective, Psychomotor). Weights must sum to 100%."
        >
          <div className="mb-5">
            <label className={labelClass}>
              Number of Course Outcomes <span className="text-red-400">*</span>
            </label>
            <input
              type="number" value={numCOs} onChange={handleNumCOsChange}
              min="1" max="20" placeholder="Enter number (1–20)"
              className={`${inputClass} md:w-56`}
            />
          </div>

          {courseOutcomes.length > 0 && (
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-700/50">
              <span className="text-gray-400 text-sm">Total Weight:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${weightOk
                ? 'bg-green-500/15 border-green-500/40 text-green-400'
                : 'bg-red-500/15 border-red-500/40 text-red-400'
                }`}>
                {weightSum.toFixed(1)}% {weightOk ? '✓ Good to go' : '— must reach 100%'}
              </span>
            </div>
          )}

          {courseOutcomes.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-700/50 rounded-2xl bg-gray-700/10">
              <Target className="text-gray-600 mx-auto mb-3" size={34} />
              <p className="text-gray-400 font-medium text-sm">No course outcomes yet</p>
              <p className="text-gray-500 text-xs mt-1">Enter the number above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseOutcomes.map((co, index) => (
                <div key={co.id}
                  className="bg-gray-700/30 border border-gray-600/40 rounded-xl p-4 group hover:border-gray-500/60 hover:bg-gray-700/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-lg">
                        CO{index + 1}
                      </span>
                      <span className="text-gray-200 text-sm font-medium">Course Outcome {index + 1}</span>
                    </div>
                    <button type="button" onClick={() => deleteCO(index)}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className={labelClass}>Weight (%) <span className="text-red-400">*</span></label>
                    <input type="number" placeholder="0–100" value={co.weight}
                      onChange={(e) => handleCOChange(index, 'weight', e.target.value)}
                      className={`${inputClass} md:w-48`} min="0" max="100" step="0.1" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">
                        Domain Taxonomy Levels <span className="text-red-400">*</span>
                      </label>
                      <span className="text-gray-400 text-xs">Select at least one domain</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Cognitive (Bloom's) */}
                      <div className="bg-gray-850/70 border border-blue-500/25 rounded-xl p-3 bg-gray-900/40">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          <span className="text-xs font-bold text-blue-300">Cognitive (Bloom's)</span>
                        </div>
                        <select
                          value={co.cognitive || ''}
                          onChange={(e) => {
                            handleCOChange(index, 'cognitive', e.target.value);
                            handleCOChange(index, 'blooms', e.target.value);
                          }}
                          className={`${inputClass} text-xs py-2 cursor-pointer border-blue-500/20 focus:border-blue-500`}
                        >
                          <option value="">None / Optional</option>
                          {cognitiveLevels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>

                      {/* Affective (Krathwohl's) */}
                      <div className="bg-gray-850/70 border border-purple-500/25 rounded-xl p-3 bg-gray-900/40">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                          <span className="text-xs font-bold text-purple-300">Affective (Krathwohl)</span>
                        </div>
                        <select
                          value={co.affective || ''}
                          onChange={(e) => handleCOChange(index, 'affective', e.target.value)}
                          className={`${inputClass} text-xs py-2 cursor-pointer border-purple-500/20 focus:border-purple-500`}
                        >
                          <option value="">None / Optional</option>
                          {affectiveLevels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>

                      {/* Psychomotor (Simpson's) */}
                      <div className="bg-gray-850/70 border border-emerald-500/25 rounded-xl p-3 bg-gray-900/40">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span className="text-xs font-bold text-emerald-300">Psychomotor (Simpson)</span>
                        </div>
                        <select
                          value={co.psychomotor || ''}
                          onChange={(e) => handleCOChange(index, 'psychomotor', e.target.value)}
                          className={`${inputClass} text-xs py-2 cursor-pointer border-emerald-500/20 focus:border-emerald-500`}
                        >
                          <option value="">None / Optional</option>
                          {psychomotorLevels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Active tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-gray-700/50">
                      <span className="text-xs text-gray-400 font-medium">Configured:</span>
                      {co.cognitive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/20 border border-blue-500/30 text-blue-300">
                          Cognitive: {co.cognitive}
                        </span>
                      )}
                      {co.affective && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-500/20 border border-purple-500/30 text-purple-300">
                          Affective: {co.affective}
                        </span>
                      )}
                      {co.psychomotor && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                          Psychomotor: {co.psychomotor}
                        </span>
                      )}
                      {!co.cognitive && !co.affective && !co.psychomotor && (
                        <span className="text-xs text-amber-400/90 font-medium">
                          ⚠️ No domain selected yet — please select at least one domain level above
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── 3. Modules ── */}
        <SectionCard
          icon={<BookOpen size={16} />}
          title="Course Modules"
          subtitle="Organize your course content into modules with corresponding teaching hours."
        >
          <div className="mb-5">
            <label className={labelClass}>Number of Modules <span className="text-red-400">*</span></label>
            <input type="number" value={numModules} onChange={handleNumModulesChange}
              min="1" max="20" placeholder="Enter number (1–20)"
              className={`${inputClass} md:w-56`} />
          </div>

          {modules.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-700/50 rounded-2xl bg-gray-700/10">
              <BookOpen className="text-gray-600 mx-auto mb-3" size={34} />
              <p className="text-gray-400 font-medium text-sm">No modules yet</p>
              <p className="text-gray-500 text-xs mt-1">Enter the number above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((module, index) => (
                <div key={module.id}
                  className="bg-gray-700/30 border border-gray-600/40 rounded-xl p-4 group hover:border-gray-500/60 hover:bg-gray-700/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold rounded-lg">
                        M{index + 1}
                      </span>
                      <span className="text-gray-200 text-sm font-medium">Module {index + 1}</span>
                    </div>
                    <button type="button" onClick={() => deleteModule(index)}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className={labelClass}>Module Name <span className="text-red-400">*</span></label>
                      <input type="text" placeholder="Enter module name or topic..."
                        value={module.name} onChange={(e) => handleModuleChange(index, 'name', e.target.value)}
                        className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Teaching Hours <span className="text-red-400">*</span></label>
                      <input type="number" placeholder="Hours" value={module.hours}
                        onChange={(e) => handleModuleChange(index, 'hours', e.target.value)}
                        className={inputClass} min="0" step="0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── 4. Question Paper ── */}
        <SectionCard
          icon={<Upload size={16} />}
          title="Question Paper"
          subtitle="Upload your question paper as an Excel file, or enter the questions manually."
        >
          {/* Mode toggle */}
          <div className="flex gap-2 mb-5 p-1 bg-gray-900/60 border border-gray-700/60 rounded-xl w-fit">
            <button type="button"
              onClick={() => { setInputMode('excel'); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${inputMode === 'excel' ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300' : 'text-gray-400 hover:text-gray-200'
                }`}>
              <FileText size={14} /> Upload Excel File
            </button>
            <button type="button"
              onClick={() => { setInputMode('manual'); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${inputMode === 'manual' ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300' : 'text-gray-400 hover:text-gray-200'
                }`}>
              <PenLine size={14} /> Enter Questions Manually
            </button>
          </div>

          {inputMode === 'excel' ? (
            <>
              <div className="flex justify-end mb-4">
                <button type="button" onClick={downloadSample}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-300 text-xs rounded-lg hover:bg-gray-600 hover:text-white transition-colors">
                  <FileText size={13} />
                  Download Sample Format
                </button>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200
                  ${dragOver
                    ? 'border-blue-400/70 bg-blue-500/5'
                    : file
                      ? 'border-green-400/60 bg-green-500/5'
                      : 'border-gray-600/60 hover:border-gray-500 hover:bg-gray-700/20 cursor-pointer'
                  }`}
              >
                {file ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 bg-green-500/15 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto">
                      <FileText className="text-green-400" size={26} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{file.name}</p>
                      <p className="text-gray-400 text-sm mt-0.5">
                        Ready to analyse · {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button type="button" onClick={() => setFile(null)}
                      className="text-red-400 hover:text-red-300 text-sm underline transition-colors">
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-14 h-14 bg-gray-700 border border-gray-600 rounded-2xl flex items-center justify-center mx-auto">
                      <Upload className="text-gray-400" size={26} />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Drop your file here</p>
                      <p className="text-gray-400 text-sm mt-1">or click the button below to browse</p>
                      <p className="text-gray-500 text-xs mt-2">Supported: .xlsx, .xls · Max 10 MB</p>
                    </div>
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-xl hover:bg-gray-600 hover:border-gray-500 cursor-pointer transition-colors">
                      <FileText size={14} />
                      Choose File
                    </label>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-5">
                <label className={labelClass}>Number of Questions <span className="text-red-400">*</span></label>
                <input type="number" value={numQuestions} onChange={handleNumQuestionsChange}
                  min="1" max="100" placeholder="Enter number (1–100)"
                  className={`${inputClass} md:w-56`} />
              </div>

              {questions.length > 0 && (
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-700/50">
                  <span className="text-gray-400 text-sm">Total Marks:</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold border bg-blue-500/15 border-blue-500/40 text-blue-300">
                    {questionsTotalMarks}
                  </span>
                </div>
              )}

              {questions.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-700/50 rounded-2xl bg-gray-700/10">
                  <ListChecks className="text-gray-600 mx-auto mb-3" size={34} />
                  <p className="text-gray-400 font-medium text-sm">No questions yet</p>
                  <p className="text-gray-500 text-xs mt-1">Enter the number above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, index) => (
                    <div key={q.id}
                      className="bg-gray-700/30 border border-gray-600/40 rounded-xl p-4 group hover:border-gray-500/60 hover:bg-gray-700/40 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold rounded-lg">
                            Q{index + 1}
                          </span>
                          <span className="text-gray-200 text-sm font-medium">Question {index + 1}</span>
                        </div>
                        <button type="button" onClick={() => deleteQuestion(index)}
                          className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="mb-3">
                        <label className={labelClass}>Question Text <span className="text-red-400">*</span></label>
                        <textarea rows={2} placeholder="Type the question here..."
                          value={q.question} onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                          className={`${inputClass} resize-none`} />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className={labelClass}>CO <span className="text-red-400">*</span></label>
                          <select value={q.co} onChange={(e) => handleQuestionChange(index, 'co', e.target.value)}
                            className={`${inputClass} cursor-pointer`}>
                            <option value="">Select CO</option>
                            {courseOutcomes.map((_, i) => (
                              <option key={i} value={`CO${i + 1}`}>{`CO${i + 1}`}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Marks <span className="text-red-400">*</span></label>
                          <input type="number" placeholder="Marks" value={q.marks}
                            onChange={(e) => handleQuestionChange(index, 'marks', e.target.value)}
                            className={inputClass} min="0" step="0.5" />
                        </div>
                        <div>
                          <label className={labelClass}>Difficulty <span className="text-red-400">*</span></label>
                          <select value={q.difficulty} onChange={(e) => handleQuestionChange(index, 'difficulty', e.target.value)}
                            className={`${inputClass} cursor-pointer`}>
                            <option value="">Select</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Module <span className="text-red-400">*</span></label>
                          <select value={q.module} onChange={(e) => handleQuestionChange(index, 'module', e.target.value)}
                            className={`${inputClass} cursor-pointer`}>
                            <option value="">Select Module</option>
                            {modules.map((m, i) => (
                              <option key={i} value={m.name || `Module ${i + 1}`}>{m.name || `Module ${i + 1}`}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* ── Submit ── */}
        <div className="flex justify-center pb-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || (inputMode === 'excel' ? !file : questions.length === 0)}
            className={`group flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-base shadow-xl transition-all duration-200
              bg-gradient-to-r from-blue-500 to-purple-600
              ${(isUploading || (inputMode === 'excel' ? !file : questions.length === 0))
                ? 'opacity-50 cursor-not-allowed shadow-none'
                : 'hover:scale-105 hover:shadow-blue-500/30 hover:shadow-2xl'
              }`}
          >
            {isUploading ? (
              <><Loader2 size={20} className="animate-spin" />Uploading &amp; Analysing...</>
            ) : (
              <><Check size={20} className="group-hover:scale-110 transition-transform" />Submit Paper for Analysis</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UploadPage;
