import { useEffect, useMemo, useState } from 'react';

const SQM_PER_PYEONG = 3.3058;
const STORAGE_KEY = 'propertyListingsV1';
const TRADE_TYPES = ['매매', '임대', '매매+임대'];

const PROPERTY_TYPES = {
  land: { label: '토지', fields: ['소재지', '거래유형', '대지면적(평)', '대지면적(㎡)', '용도지역', '지목', '추천용도', '매매가격', '평당가', '보증금', '월세', '관리비', '대표사진', 'AI 매물 분석 요약', '비고'], areaPairs: [{ p: '대지면적(평)', s: '대지면적(㎡)' }] },
  store: { label: '상가', fields: ['소재지', '건물명', '해당층', '거래유형', '계약면적(평)', '계약면적(㎡)', '전용면적(평)', '전용면적(㎡)', '매매가격', '평당가', '보증금', '월세', '권리금', '관리비', '현재업종', '추천업종', '대표사진', 'AI 매물 분석 요약', '비고'], areaPairs: [{ p: '계약면적(평)', s: '계약면적(㎡)' }, { p: '전용면적(평)', s: '전용면적(㎡)' }] },
  factory: { label: '공장창고', fields: ['소재지', '거래유형', '전용면적(평)', '전용면적(㎡)', '토지면적(평)', '토지면적(㎡)', '매매가격', '평당가', '보증금', '월세', '관리비', '층고', '전력', '주차', '대표사진', 'AI 매물 분석 요약', '비고'], areaPairs: [{ p: '전용면적(평)', s: '전용면적(㎡)' }, { p: '토지면적(평)', s: '토지면적(㎡)' }] },
};

const emptyForm = (type) => {
  const obj = Object.fromEntries(PROPERTY_TYPES[type].fields.map((f) => [f, '']));
  obj['거래유형'] = '매매';
  return obj;
};

const toNum = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};
const areaText = (p, s) => {
  const pv = toNum(p); const sv = toNum(s);
  if (pv === null && sv === null) return '-';
  const p2 = pv ?? (sv / SQM_PER_PYEONG);
  const s2 = sv ?? (pv * SQM_PER_PYEONG);
  return `${p2.toFixed(2)}평 / ${s2.toFixed(2)}㎡`;
};

const tradeFieldsVisible = (field, tradeType) => {
  if (['매매가격', '평당가'].includes(field)) return tradeType !== '임대';
  if (['보증금', '월세', '관리비'].includes(field)) return tradeType !== '매매';
  return true;
};

const hidden = new Set(['대표사진', 'AI 매물 분석 요약', '비고']);

export default function App() {
  const [type, setType] = useState('land');
  const [formData, setFormData] = useState(emptyForm('land'));
  const [listings, setListings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [printMode, setPrintMode] = useState('detail');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try { setListings(JSON.parse(raw)); } catch { setListings([]); }
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(listings)); }, [listings]);

  const currentFields = PROPERTY_TYPES[type].fields;
  const selectedListings = useMemo(() => listings.filter((v) => selectedIds.includes(v.id)), [listings, selectedIds]);
  const canCompare = selectedListings.length >= 1 && selectedListings.length <= 3 && new Set(selectedListings.map((v) => v.type)).size === 1;
  const canDetail = selectedListings.length === 1;

  const handleInput = (field, value) => {
    setMessage('');
    const next = { ...formData, [field]: value };
    for (const pair of PROPERTY_TYPES[type].areaPairs) {
      if (field === pair.p) { const n = toNum(value); next[pair.s] = n === null ? '' : (n * SQM_PER_PYEONG).toFixed(2); }
      if (field === pair.s) { const n = toNum(value); next[pair.p] = n === null ? '' : (n / SQM_PER_PYEONG).toFixed(2); }
    }
    setFormData(next);
  };

  const saveListing = (e) => {
    e.preventDefault();
    if (!formData['소재지']?.trim()) { setMessage('소재지를 입력해주세요.'); return; }

    const now = Date.now();
    const tradeType = formData['거래유형'] || '매매';
    const payload = {
      id: editingId || crypto.randomUUID(),
      type,
      tradeType,
      data: { ...formData },
      representativePhoto: formData['대표사진'] || '',
      createdAt: now,
    };

    setListings((prev) => {
      if (editingId) return prev.map((item) => (item.id === editingId ? payload : item));
      return [payload, ...prev];
    });

    setSelectedIds([payload.id]);
    setPrintMode('detail');
    setEditingId(null);
    setFormData(emptyForm(type));
    setMessage('매물이 저장되었습니다.');
  };

  const onEdit = (id) => {
    const target = listings.find((v) => v.id === id);
    if (!target) return;
    setType(target.type);
    setFormData({ ...target.data });
    setEditingId(target.id);
    setSelectedIds([target.id]);
    setPrintMode('detail');
    setMessage('수정 후 저장해 주세요.');
  };

  const onDelete = (id) => {
    setListings((prev) => prev.filter((v) => v.id !== id));
    setSelectedIds((prev) => prev.filter((v) => v !== id));
    if (editingId === id) { setEditingId(null); setFormData(emptyForm(type)); }
  };

  const validationMessage = listings.length === 0
    ? '매물을 입력하고 저장하면 이곳에 매물장이 표시됩니다.'
    : printMode === 'compare'
      ? (!canCompare ? '비교 매물장은 같은 유형의 매물을 1~3개 선택해 주세요.' : '')
      : (!canDetail ? '개별 매물장은 매물 1개를 선택해야 합니다.' : '');

  return <div className="app"><header className="app-header no-print"><h1>하이탑 매물장 자동생성 시스템</h1></header><main className="workspace">
    <section className="panel form-panel no-print"><h2>입력폼</h2><p className="guide">도로접면/진입도로/도로 설명은 비고 또는 AI 매물 분석 요약에 작성해 주세요.</p>
      <div className="type-tabs">{Object.entries(PROPERTY_TYPES).map(([k, v]) => <button key={k} type="button" className={type === k ? 'active' : ''} onClick={() => { setType(k); setFormData(emptyForm(k)); setEditingId(null); }}>{v.label}</button>)}</div>
      <form className="form-grid" onSubmit={saveListing}>{currentFields.filter((f) => tradeFieldsVisible(f, formData['거래유형'])).map((field) => <label key={field}><span>{field}</span>{field === '거래유형' ? <div className="type-tabs">{TRADE_TYPES.map((t) => <button type="button" key={t} className={formData['거래유형'] === t ? 'active' : ''} onClick={() => handleInput('거래유형', t)}>{t}</button>)}</div> : field === '대표사진' ? <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => handleInput(field, r.result); r.readAsDataURL(file); }} /> : ['AI 매물 분석 요약', '비고'].includes(field) ? <textarea rows={4} value={formData[field]} onChange={(e) => handleInput(field, e.target.value)} /> : <input value={formData[field]} onChange={(e) => handleInput(field, e.target.value)} />}</label>)}
        <div className="form-actions"><button type="submit" className="primary">{editingId ? '수정 저장' : '저장'}</button></div>
      </form>{message && <p className="guide">{message}</p>}</section>

    <section className="preview panel"><h2 className="no-print">출력 미리보기</h2><div className="no-print mode-switch"><button type="button" className={printMode === 'compare' ? 'active' : ''} onClick={() => setPrintMode('compare')}>비교 매물장</button><button type="button" className={printMode === 'detail' ? 'active' : ''} onClick={() => setPrintMode('detail')}>개별 매물장</button><button type="button" className="primary" onClick={() => window.print()} disabled={Boolean(validationMessage)}>인쇄</button></div>{validationMessage && <p className="guide no-print">{validationMessage}</p>}
      {printMode === 'compare' && canCompare && <div className="paper compare-page"><h3>{PROPERTY_TYPES[selectedListings[0].type].label} 비교 매물장</h3><div className="compare-list">{selectedListings.slice(0, 3).map((item, i) => <article key={item.id} className="compare-item"><div className="item-label">매물 {i + 1}</div><div className="item-body"><div className="photo-wrap">{item.representativePhoto ? <img src={item.representativePhoto} alt="대표사진" /> : <div className="photo-empty">사진 없음</div>}</div><table><tbody>{Object.entries(item.data).filter(([k]) => !hidden.has(k) && !k.endsWith('(㎡)') && tradeFieldsVisible(k, item.tradeType)).map(([k, v]) => <tr key={k}><th>{k}</th><td>{k.endsWith('(평)') ? areaText(v, item.data[k.replace('(평)', '(㎡)')]) : (v || '-')}</td></tr>)}</tbody></table></div></article>)}</div></div>}
      {printMode === 'detail' && canDetail && <div className="paper detail-page"><h3>{selectedListings[0].data['소재지'] || '개별 매물장'}</h3><div className="detail-photo-wrap">{selectedListings[0].representativePhoto ? <img src={selectedListings[0].representativePhoto} alt="대표사진" /> : <div className="photo-empty">사진 없음</div>}</div><table className="detail-table"><tbody>{Object.entries(selectedListings[0].data).filter(([k]) => !hidden.has(k) && !k.endsWith('(㎡)') && tradeFieldsVisible(k, selectedListings[0].tradeType)).map(([k, v]) => <tr key={k}><th>{k}</th><td>{k.endsWith('(평)') ? areaText(v, selectedListings[0].data[k.replace('(평)', '(㎡)')]) : (v || '-')}</td></tr>)}</tbody></table><section className="ai-box"><h4>AI 매물 분석 요약</h4><p>{selectedListings[0].data['AI 매물 분석 요약'] || '요약 없음'}</p></section><section className="memo-box"><h4>비고</h4><p>{selectedListings[0].data['비고'] || '-'}</p></section></div>}
    </section>

    <section className="panel list-panel no-print"><h2>저장된 매물 목록</h2><ul className="listing-list">{listings.map((item) => <li key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((prev) => prev.includes(item.id) ? prev.filter((v) => v !== item.id) : [...prev, item.id])} /><strong>{PROPERTY_TYPES[item.type].label}</strong><span>{item.tradeType}</span><span>{item.data['소재지'] || '(소재지 미입력)'}</span><span>{item.tradeType === '매매' ? `매매 ${item.data['매매가격'] || '-'}` : item.tradeType === '임대' ? `임대 ${item.data['보증금'] || '-'} / ${item.data['월세'] || '-'}` : `매매 ${item.data['매매가격'] || '-'} · 임대 ${item.data['보증금'] || '-'} / ${item.data['월세'] || '-'}`}</span><span>{item.type === 'land' ? areaText(item.data['대지면적(평)'], item.data['대지면적(㎡)']) : item.type === 'store' ? areaText(item.data['전용면적(평)'], item.data['전용면적(㎡)']) : areaText(item.data['전용면적(평)'], item.data['전용면적(㎡)'])}</span><div className="row-actions"><button type="button" onClick={() => onEdit(item.id)}>수정</button><button type="button" onClick={() => onDelete(item.id)}>삭제</button></div></li>)}</ul></section>
  </main></div>;
}
