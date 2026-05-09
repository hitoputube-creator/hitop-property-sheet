import { useEffect, useMemo, useState } from 'react';

const PROPERTY_TYPES = {
  land: {
    label: '토지',
    fields: [
      '소재지', '대지면적(평)', '용도지역', '지목', '도로접면', '추천용도',
      '매매가격', '평당가', '대표사진', 'AI 매물 분석 요약', '비고',
    ],
  },
  store: {
    label: '상가',
    fields: [
      '소재지', '건물명', '해당층', '계약면적(평)', '전용면적(평)', '보증금',
      '월세', '매매가격', '현재업종', '추천업종', '대표사진', 'AI 매물 분석 요약', '비고',
    ],
  },
  factory: {
    label: '공장창고',
    fields: [
      '소재지', '보증금', '월세', '전용면적(평)', '토지면적(평)', '층고',
      '전력', '진입도로', '주차', '대표사진', 'AI 매물 분석 요약', '비고',
    ],
  },
};

const STORAGE_KEY = 'propertyListingsV1';

const emptyForm = (type) => Object.fromEntries(PROPERTY_TYPES[type].fields.map((f) => [f, '']));

export default function App() {
  const [type, setType] = useState('land');
  const [formData, setFormData] = useState(emptyForm('land'));
  const [listings, setListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [printMode, setPrintMode] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setListings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  }, [listings]);

  const currentFields = PROPERTY_TYPES[type].fields;
  const selectedListings = useMemo(
    () => listings.filter((item) => selectedIds.includes(item.id)),
    [listings, selectedIds],
  );

  const onChangeType = (nextType) => {
    setType(nextType);
    setFormData(emptyForm(nextType));
  };

  const handleInput = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleImageUpload = (field, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleInput(field, reader.result);
    reader.readAsDataURL(file);
  };

  const onSave = (e) => {
    e.preventDefault();
    setListings((prev) => [{ id: crypto.randomUUID(), type, data: formData, createdAt: Date.now() }, ...prev]);
    setFormData(emptyForm(type));
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const compareChunks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < selectedListings.length; i += 3) arr.push(selectedListings.slice(i, i + 3));
    return arr;
  }, [selectedListings]);

  return (
    <div className="app">
      <h1>토지/상가/공장창고 매물장 자동생성기</h1>

      <section className="panel no-print">
        <h2>1) 매물 입력</h2>
        <div className="type-tabs">
          {Object.entries(PROPERTY_TYPES).map(([key, cfg]) => (
            <button key={key} className={type === key ? 'active' : ''} onClick={() => onChangeType(key)}>{cfg.label}</button>
          ))}
        </div>

        <form onSubmit={onSave} className="form-grid">
          {currentFields.map((field) => (
            <label key={field}>
              <span>{field}</span>
              {field === '대표사진' ? (
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(field, e.target.files?.[0])} />
              ) : field === 'AI 매물 분석 요약' || field === '비고' ? (
                <textarea value={formData[field]} onChange={(e) => handleInput(field, e.target.value)} rows={3} />
              ) : (
                <input value={formData[field]} onChange={(e) => handleInput(field, e.target.value)} />
              )}
            </label>
          ))}
          <button type="submit" className="primary">저장</button>
        </form>
      </section>

      <section className="panel no-print">
        <h2>2) 저장된 매물 목록</h2>
        <ul className="listing-list">
          {listings.map((item) => (
            <li key={item.id}>
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} />
              <strong>{PROPERTY_TYPES[item.type].label}</strong>
              <span>{item.data['소재지'] || '(소재지 미입력)'}</span>
              <span>{item.data['매매가격'] || item.data['월세'] || '-'}</span>
            </li>
          ))}
        </ul>
        <div className="actions">
          <button onClick={() => setPrintMode('compare')} disabled={selectedIds.length === 0}>비교 매물장 만들기</button>
          <button onClick={() => setPrintMode('detail')} disabled={selectedIds.length !== 1}>개별 매물장 만들기</button>
          <button className="primary" onClick={() => window.print()} disabled={!printMode}>인쇄</button>
        </div>
      </section>

      <section className="preview">
        <h2 className="no-print">3) 출력 미리보기</h2>
        {printMode === 'compare' && compareChunks.map((chunk, pageIdx) => (
          <div className="paper" key={pageIdx}>
            <h3>비교 매물장 ({pageIdx + 1} 페이지)</h3>
            <div className="cards three-col">
              {chunk.map((item) => (
                <article key={item.id} className="card">
                  <h4>{PROPERTY_TYPES[item.type].label}</h4>
                  {item.data['대표사진'] && <img src={item.data['대표사진']} alt="대표사진" />}
                  {Object.entries(item.data).filter(([k]) => k !== '대표사진').map(([k, v]) => (
                    <p key={k}><b>{k}:</b> {v || '-'}</p>
                  ))}
                </article>
              ))}
            </div>
          </div>
        ))}

        {printMode === 'detail' && selectedListings[0] && (
          <div className="paper">
            <h3>개별 매물장</h3>
            <article className="detail-card">
              <h4>{PROPERTY_TYPES[selectedListings[0].type].label}</h4>
              {selectedListings[0].data['대표사진'] && <img src={selectedListings[0].data['대표사진']} alt="대표사진" />}
              {Object.entries(selectedListings[0].data).filter(([k]) => !['대표사진', 'AI 매물 분석 요약'].includes(k)).map(([k, v]) => (
                <p key={k}><b>{k}:</b> {v || '-'}</p>
              ))}
              <div className="ai-summary">
                <h5>AI 매물 분석 요약</h5>
                <p>{selectedListings[0].data['AI 매물 분석 요약'] || '요약 없음'}</p>
              </div>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}
