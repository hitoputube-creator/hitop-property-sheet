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

const COMPARE_HIDDEN_FIELDS = new Set(['대표사진', 'AI 매물 분석 요약', '비고']);
const DETAIL_HIDDEN_FIELDS = new Set(['대표사진', 'AI 매물 분석 요약', '비고']);

export default function App() {
  const [type, setType] = useState('land');
  const [formData, setFormData] = useState(emptyForm('land'));
  const [listings, setListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [printMode, setPrintMode] = useState('compare');
  const [editingId, setEditingId] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');

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

  const compareChunks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < selectedListings.length; i += 3) arr.push(selectedListings.slice(i, i + 3));
    return arr;
  }, [selectedListings]);

  const canCompare = useMemo(() => {
    if (selectedListings.length === 0 || selectedListings.length > 3) return false;
    return new Set(selectedListings.map((item) => item.type)).size === 1;
  }, [selectedListings]);

  const canDetail = selectedListings.length === 1;

  useEffect(() => {
    if (printMode === 'compare') {
      if (selectedListings.length === 0) {
        setValidationMessage('비교 매물장은 같은 유형의 매물을 1~3개 선택해 주세요.');
      } else if (selectedListings.length > 3) {
        setValidationMessage('비교 매물장은 최대 3개까지만 선택할 수 있습니다.');
      } else if (new Set(selectedListings.map((item) => item.type)).size > 1) {
        setValidationMessage('비교 매물장은 같은 유형의 매물만 선택할 수 있습니다.');
      } else {
        setValidationMessage('');
      }
    } else if (printMode === 'detail') {
      if (selectedListings.length !== 1) {
        setValidationMessage('개별 매물장은 매물 1개를 선택해야 합니다.');
      } else {
        setValidationMessage('');
      }
    }
  }, [printMode, selectedListings]);

  const onChangeType = (nextType) => {
    setType(nextType);
    setFormData(emptyForm(nextType));
    setEditingId(null);
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
    if (editingId) {
      setListings((prev) => prev.map((item) => (item.id === editingId ? { ...item, type, data: formData } : item)));
    } else {
      setListings((prev) => [{ id: crypto.randomUUID(), type, data: formData, createdAt: Date.now() }, ...prev]);
    }
    setFormData(emptyForm(type));
    setEditingId(null);
  };

  const onEdit = (id) => {
    const target = listings.find((item) => item.id === id);
    if (!target) return;
    setEditingId(id);
    setType(target.type);
    setFormData({ ...target.data });
  };

  const onDelete = (id) => {
    setListings((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    if (editingId === id) {
      setEditingId(null);
      setFormData(emptyForm(type));
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const renderCompare = printMode === 'compare' && canCompare;
  const renderDetail = printMode === 'detail' && canDetail;

  return (
    <div className="app">
      <header className="app-header no-print">
        <h1>하이탑 매물장 자동생성 시스템</h1>
      </header>

      <main className="workspace">
        <section className="panel form-panel no-print">
          <h2>입력폼</h2>
          <div className="type-tabs">
            {Object.entries(PROPERTY_TYPES).map(([key, cfg]) => (
              <button key={key} className={type === key ? 'active' : ''} onClick={() => onChangeType(key)} type="button">{cfg.label}</button>
            ))}
          </div>

          <form onSubmit={onSave} className="form-grid">
            {currentFields.map((field) => (
              <label key={field}>
                <span>{field}</span>
                {field === '대표사진' ? (
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(field, e.target.files?.[0])} />
                ) : field === 'AI 매물 분석 요약' || field === '비고' ? (
                  <textarea value={formData[field]} onChange={(e) => handleInput(field, e.target.value)} rows={4} />
                ) : (
                  <input value={formData[field]} onChange={(e) => handleInput(field, e.target.value)} />
                )}
              </label>
            ))}
            <div className="form-actions">
              <button type="submit" className="primary">{editingId ? '수정 저장' : '저장'}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData(emptyForm(type)); }}>취소</button>}
            </div>
          </form>
        </section>

        <section className="preview panel">
          <h2 className="no-print">출력 미리보기</h2>
          <div className="no-print mode-switch">
            <button type="button" className={printMode === 'compare' ? 'active' : ''} onClick={() => setPrintMode('compare')}>비교 매물장</button>
            <button type="button" className={printMode === 'detail' ? 'active' : ''} onClick={() => setPrintMode('detail')}>개별 매물장</button>
            <button className="primary" type="button" onClick={() => window.print()} disabled={Boolean(validationMessage)}>인쇄</button>
          </div>
          {validationMessage && <p className="guide no-print">{validationMessage}</p>}

          {renderCompare && compareChunks.map((chunk, pageIdx) => (
            <div className="paper compare-page" key={pageIdx}>
              <h3>{PROPERTY_TYPES[chunk[0].type].label} 비교 매물장</h3>
              <div className="compare-list">
                {chunk.map((item, idx) => (
                  <article key={item.id} className="compare-item">
                    <div className="item-label">매물 {idx + 1}</div>
                    <div className="item-body">
                      <div className="photo-wrap">{item.data['대표사진'] ? <img src={item.data['대표사진']} alt="대표사진" /> : <div className="photo-empty">사진 없음</div>}</div>
                      <table>
                        <tbody>
                          {Object.entries(item.data)
                            .filter(([k]) => !COMPARE_HIDDEN_FIELDS.has(k))
                            .map(([k, v]) => (
                              <tr key={k}><th>{k}</th><td>{v || '-'}</td></tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))}
              </div>
              <footer className="contact">하이탑부동산 010-1234-5678</footer>
            </div>
          ))}

          {renderDetail && selectedListings[0] && (
            <div className="paper detail-page">
              <h3>{selectedListings[0].data['매물명'] || selectedListings[0].data['소재지'] || '개별 매물장'}</h3>
              <div className="detail-photo-wrap">{selectedListings[0].data['대표사진'] ? <img src={selectedListings[0].data['대표사진']} alt="대표사진" /> : <div className="photo-empty">사진 없음</div>}</div>
              <table className="detail-table"><tbody>
                {Object.entries(selectedListings[0].data)
                  .filter(([k]) => !DETAIL_HIDDEN_FIELDS.has(k))
                  .map(([k, v]) => <tr key={k}><th>{k}</th><td>{v || '-'}</td></tr>)}
              </tbody></table>
              <section className="ai-box">
                <h4>AI 매물 분석 요약</h4>
                <p>{selectedListings[0].data['AI 매물 분석 요약'] || '요약 없음'}</p>
              </section>
              <section className="memo-box">
                <h4>비고</h4>
                <p>{selectedListings[0].data['비고'] || '-'}</p>
              </section>
              <footer className="contact">하이탑부동산 010-1234-5678</footer>
            </div>
          )}
        </section>

        <section className="panel list-panel no-print">
          <h2>저장된 매물 목록</h2>
          <ul className="listing-list">
            {listings.map((item) => (
              <li key={item.id}>
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelection(item.id)} />
                <strong>{PROPERTY_TYPES[item.type].label}</strong>
                <span>{item.data['소재지'] || '(소재지 미입력)'}</span>
                <span>{item.data['매매가격'] || item.data['월세'] || '-'}</span>
                <div className="row-actions">
                  <button type="button" onClick={() => onEdit(item.id)}>수정</button>
                  <button type="button" onClick={() => onDelete(item.id)}>삭제</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
