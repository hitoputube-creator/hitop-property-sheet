import { useEffect, useMemo, useState } from 'react';

const SQM_PER_PYEONG = 3.3058;
const STORAGE_KEY = 'propertyListingsV1';
const TRADE_TYPES = ['매매', '임대', '매매+임대'];

const PROPERTY_TYPES = {
  land: {
    label: '토지',
    fields: ['소재지', '거래유형', '대지면적(평)', '대지면적(㎡)', '용도지역', '지목', '추천용도', '매매가격', '평당가', '보증금', '월세', '관리비', '대표사진', 'AI 매물 분석 요약', '비고'],
    areaPairs: [{ pyeong: '대지면적(평)', sqm: '대지면적(㎡)' }],
  },
  store: {
    label: '상가',
    fields: ['소재지', '건물명', '해당층', '거래유형', '계약면적(평)', '계약면적(㎡)', '전용면적(평)', '전용면적(㎡)', '매매가격', '평당가', '보증금', '월세', '권리금', '관리비', '현재업종', '추천업종', '대표사진', 'AI 매물 분석 요약', '비고'],
    areaPairs: [{ pyeong: '계약면적(평)', sqm: '계약면적(㎡)' }, { pyeong: '전용면적(평)', sqm: '전용면적(㎡)' }],
  },
  factory: {
    label: '공장창고',
    fields: ['소재지', '거래유형', '전용면적(평)', '전용면적(㎡)', '토지면적(평)', '토지면적(㎡)', '매매가격', '평당가', '보증금', '월세', '관리비', '층고', '전력', '주차', '대표사진', 'AI 매물 분석 요약', '비고'],
    areaPairs: [{ pyeong: '전용면적(평)', sqm: '전용면적(㎡)' }, { pyeong: '토지면적(평)', sqm: '토지면적(㎡)' }],
  },
};

const hiddenFields = new Set(['대표사진', 'AI 매물 분석 요약', '비고']);

const emptyForm = (type) => {
  const base = Object.fromEntries(PROPERTY_TYPES[type].fields.map((f) => [f, '']));
  base['거래유형'] = '매매';
  return base;
};

const toNum = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

const formatArea = (pyeong, sqm) => {
  const p = toNum(pyeong);
  const s = toNum(sqm);
  if (p === null && s === null) return '-';
  const p2 = p ?? s / SQM_PER_PYEONG;
  const s2 = s ?? p * SQM_PER_PYEONG;
  return `${p2.toFixed(2)}평 / ${s2.toFixed(2)}㎡`;
};

const shouldShowField = (field, tradeType) => {
  if (['매매가격', '평당가'].includes(field)) return tradeType !== '임대';
  if (['보증금', '월세', '관리비'].includes(field)) return tradeType !== '매매';
  return true;
};

const mainAreaByType = (item) => {
  if (item.type === 'land') return formatArea(item.data['대지면적(평)'], item.data['대지면적(㎡)']);
  if (item.type === 'store') return formatArea(item.data['전용면적(평)'], item.data['전용면적(㎡)']);
  return formatArea(item.data['전용면적(평)'], item.data['전용면적(㎡)']);
};

export default function App() {
  const [type, setType] = useState('land');
  const [formData, setFormData] = useState(emptyForm('land'));
  const [listings, setListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [printMode, setPrintMode] = useState('detail');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try { setListings(JSON.parse(saved)); } catch { setListings([]); }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  }, [listings]);

  const selectedListings = useMemo(() => listings.filter((item) => selectedIds.includes(item.id)), [listings, selectedIds]);
  const canCompare = selectedListings.length >= 1 && selectedListings.length <= 3 && new Set(selectedListings.map((item) => item.type)).size === 1;
  const canDetail = selectedListings.length === 1;

  const validationMessage = listings.length === 0
    ? '매물을 입력하고 저장하면 이곳에 매물장이 표시됩니다.'
    : printMode === 'compare'
      ? (!canCompare ? '비교 매물장은 같은 유형의 매물을 1~3개 선택해 주세요.' : '')
      : (!canDetail ? '개별 매물장은 매물 1개를 선택해야 합니다.' : '');

  const onChangeType = (nextType) => {
    setType(nextType);
    setFormData(emptyForm(nextType));
    setEditingId(null);
    setMessage('');
  };

  const handleInput = (field, value) => {
    setMessage('');
    const next = { ...formData, [field]: value };
    for (const pair of PROPERTY_TYPES[type].areaPairs) {
      if (field === pair.pyeong) {
        const n = toNum(value);
        next[pair.sqm] = n === null ? '' : (n * SQM_PER_PYEONG).toFixed(2);
      }
      if (field === pair.sqm) {
        const n = toNum(value);
        next[pair.pyeong] = n === null ? '' : (n / SQM_PER_PYEONG).toFixed(2);
      }
    }
    setFormData(next);
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleInput('대표사진', reader.result);
    reader.readAsDataURL(file);
  };

  const onSave = (e) => {
    e.preventDefault();
    if (!formData['소재지']?.trim()) {
      setMessage('소재지를 입력해주세요.');
      return;
    }

    const payload = {
      id: editingId || crypto.randomUUID(),
      type,
      tradeType: formData['거래유형'] || '매매',
      data: { ...formData },
      representativePhoto: formData['대표사진'] || '',
      createdAt: Date.now(),
    };

    setListings((prev) => (editingId ? prev.map((item) => (item.id === editingId ? payload : item)) : [payload, ...prev]));
    setSelectedIds([payload.id]);
    setPrintMode('detail');
    setEditingId(null);
    setFormData(emptyForm(type));
    setMessage('매물이 저장되었습니다.');
  };

  const onEdit = (id) => {
    const target = listings.find((item) => item.id === id);
    if (!target) return;
    setEditingId(id);
    setType(target.type);
    setFormData({ ...target.data });
    setSelectedIds([id]);
    setPrintMode('detail');
    setMessage('');
  };

  const onDelete = (id) => {
    setListings((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const toggleSelection = (id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));

  return (
    <div className="app">
      <header className="app-header no-print"><h1>하이탑 매물장 자동생성 시스템</h1></header>
      <main className="workspace">
        <section className="panel form-panel no-print">
          <h2>입력폼</h2>
          <p className="guide">도로접면/진입도로/도로 설명은 별도 항목 대신 비고 또는 AI 매물 분석 요약에 작성해 주세요.</p>
          <div className="type-tabs">{Object.entries(PROPERTY_TYPES).map(([key, cfg]) => <button key={key} className={type === key ? 'active' : ''} onClick={() => onChangeType(key)} type="button">{cfg.label}</button>)}</div>
          <form onSubmit={onSave} className="form-grid">
            {PROPERTY_TYPES[type].fields.filter((field) => shouldShowField(field, formData['거래유형'] || '매매')).map((field) => (
              <label key={field}><span>{field}</span>
                {field === '거래유형' ? <div className="type-tabs">{TRADE_TYPES.map((trade) => <button key={trade} type="button" className={formData['거래유형'] === trade ? 'active' : ''} onClick={() => handleInput('거래유형', trade)}>{trade}</button>)}</div>
                  : field === '대표사진' ? <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
                    : field === 'AI 매물 분석 요약' || field === '비고' ? <textarea value={formData[field]} onChange={(e) => handleInput(field, e.target.value)} rows={4} />
                      : <input value={formData[field]} onChange={(e) => handleInput(field, e.target.value)} />}
              </label>
            ))}
            <div className="form-actions"><button type="submit" className="primary">{editingId ? '수정 저장' : '저장'}</button></div>
          </form>
          {message && <p className="guide">{message}</p>}
        </section>

        <section className="preview panel">
          <h2 className="no-print">출력 미리보기</h2>
          <div className="no-print mode-switch">
            <button type="button" className={printMode === 'compare' ? 'active' : ''} onClick={() => setPrintMode('compare')}>비교 매물장</button>
            <button type="button" className={printMode === 'detail' ? 'active' : ''} onClick={() => setPrintMode('detail')}>개별 매물장</button>
            <button className="primary" type="button" onClick={() => window.print()} disabled={Boolean(validationMessage)}>인쇄</button>
          </div>
          {validationMessage && <p className="guide no-print">{validationMessage}</p>}

          {printMode === 'compare' && canCompare && (
            <div className="paper compare-page">
              <h3>{PROPERTY_TYPES[selectedListings[0].type].label} 비교 매물장</h3>
              <div className="compare-list">
                {selectedListings.slice(0, 3).map((item, idx) => (
                  <article key={item.id} className="compare-item"><div className="item-label">매물 {idx + 1}</div><div className="item-body"><div className="photo-wrap">{item.representativePhoto ? <img src={item.representativePhoto} alt="대표사진" /> : <div className="photo-empty">사진 없음</div>}</div><table><tbody>{Object.entries(item.data).filter(([k]) => !hiddenFields.has(k) && !k.endsWith('(㎡)') && shouldShowField(k, item.tradeType)).map(([k, v]) => <tr key={k}><th>{k}</th><td>{k.endsWith('(평)') ? formatArea(v, item.data[k.replace('(평)', '(㎡)')]) : (v || '-')}</td></tr>)}</tbody></table></div></article>
                ))}
              </div>
            </div>
          )}

          {printMode === 'detail' && canDetail && selectedListings[0] && (
            <div className="paper detail-page">
              <h3>{selectedListings[0].data['소재지'] || '개별 매물장'}</h3>
              <div className="detail-photo-wrap">{selectedListings[0].representativePhoto ? <img src={selectedListings[0].representativePhoto} alt="대표사진" /> : <div className="photo-empty">사진 없음</div>}</div>
              <table className="detail-table"><tbody>{Object.entries(selectedListings[0].data).filter(([k]) => !hiddenFields.has(k) && !k.endsWith('(㎡)') && shouldShowField(k, selectedListings[0].tradeType)).map(([k, v]) => <tr key={k}><th>{k}</th><td>{k.endsWith('(평)') ? formatArea(v, selectedListings[0].data[k.replace('(평)', '(㎡)')]) : (v || '-')}</td></tr>)}</tbody></table>
              <section className="ai-box"><h4>AI 매물 분석 요약</h4><p>{selectedListings[0].data['AI 매물 분석 요약'] || '요약 없음'}</p></section>
              <section className="memo-box"><h4>비고</h4><p>{selectedListings[0].data['비고'] || '-'}</p></section>
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
                <span>{item.tradeType}</span>
                <span>{item.data['소재지'] || '(소재지 미입력)'}</span>
                <span>{item.tradeType === '매매' ? `매매 ${item.data['매매가격'] || '-'}` : item.tradeType === '임대' ? `임대 ${item.data['보증금'] || '-'} / ${item.data['월세'] || '-'}` : `매매 ${item.data['매매가격'] || '-'} · 임대 ${item.data['보증금'] || '-'} / ${item.data['월세'] || '-'}`}</span>
                <span>{mainAreaByType(item)}</span>
                <div className="row-actions"><button type="button" onClick={() => onEdit(item.id)}>수정</button><button type="button" onClick={() => onDelete(item.id)}>삭제</button></div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
