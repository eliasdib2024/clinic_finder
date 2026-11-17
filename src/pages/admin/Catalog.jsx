import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { Library, Plus, Pencil, Trash2, Check, X, Stethoscope, ShieldCheck, Languages } from 'lucide-react';
import { Button, ConfirmDialog, ErrorState, Input, Select, SkeletonRows, Tabs, Badge } from '../../components/ui';
import { SpecialtyIcon, SPECIALTY_ICONS } from '../../components/shared/SpecialtyIcon';
import { useAsync, useDocumentTitle } from '../../hooks';
import { getCatalogWithUsage, addCatalogItem, updateCatalogItem, deleteCatalogItem } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { useCatalog } from '../../context/CatalogContext';

const META = {
  // Strings are English keys, translated at render with tx().
  specialties: { label: 'Specialties', addTitle: 'Add a specialty', addButton: 'Add specialty', newName: 'New specialty name', icon: Stethoscope, usage: (n) => tx(n === 1 ? '{0} doctor' : '{0} doctors', { 0: n }), hint: 'Used in search filters, doctor sign-up and profiles. A specialty in use can’t be deleted.' },
  insurers: { label: 'Insurance providers', addTitle: 'Add an insurer', addButton: 'Add insurer', newName: 'New insurer name', icon: ShieldCheck, usage: (n) => tx(n === 1 ? '{0} profile' : '{0} profiles', { 0: n }), hint: 'Used by the “only my insurance” filter, doctor profiles and patient settings. Deleting removes it from those profiles.' },
  languages: { label: 'Languages', addTitle: 'Add a language', addButton: 'Add language', newName: 'New language name', icon: Languages, usage: (n) => tx(n === 1 ? '{0} doctor' : '{0} doctors', { 0: n }), hint: 'Languages doctors can list and patients can filter by.' },
};
const ICON_OPTIONS = Object.keys(SPECIALTY_ICONS).map((k) => ({ value: k, label: k.replace(/([a-z])([A-Z0-9])/g, '$1 $2') }));

export default function AdminCatalog() {
  useDocumentTitle(tx('Catalog'));
  const toast = useToast();
  const { reload: reloadCatalog } = useCatalog();
  const [tab, setTab] = useState('specialties');
  const { data, loading, error, reload } = useAsync(() => getCatalogWithUsage(), []);
  const [adding, setAdding] = useState({ name: '', icon: 'Stethoscope' });
  const [addErr, setAddErr] = useState('');
  const [edit, setEdit] = useState(null); // { id, name, icon }
  const [editErr, setEditErr] = useState('');
  const [del, setDel] = useState(null);
  const meta = META[tab];
  const refresh = async () => { await reload(); await reloadCatalog().catch(() => {}); };

  const add = async (e) => {
    e.preventDefault();
    try { const item = await addCatalogItem(tab, adding); toast.success(tx('{0} added', {
      0: item.name
    }), { body: tx('It now appears in every related filter and form.') }); setAdding({ name: '', icon: 'Stethoscope' }); setAddErr(''); refresh(); }
    catch (err) { setAddErr(err.fields?.name || err.message); }
  };
  const saveEdit = async () => {
    try { await updateCatalogItem(tab, edit.id, edit); toast.success(tx('Saved')); setEdit(null); setEditErr(''); refresh(); }
    catch (err) { setEditErr(err.fields?.name || err.message); }
  };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>{tx('Catalog')}</h1><p>{tx('Reference lists that power filters and forms across ClinicFinder.')}</p></div></div>
      <Tabs label={tx('Catalog')} value={tab} onChange={(t) => { setTab(t); setEdit(null); setAddErr(''); }} tabs={Object.entries(META).map(([id, m]) => ({ id, label: m.label, icon: m.icon, count: data?.[id]?.length }))} />
      <div className="split">
        <section className="panel panel-flush" aria-label={tx(meta.label)}>
          {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <div style={{ padding: 20 }}><SkeletonRows rows={6} /></div> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {data[tab].map((item) => (
                <li key={item.id} className="row" style={{ padding: '12px 20px', borderBottom: '1px solid var(--mist)', '--gap': '12px', flexWrap: 'wrap' }}>
                  {tab === 'specialties' && <span className="kpi-ic tone-teal" style={{ width: 34, height: 34 }}><SpecialtyIcon name={edit?.id === item.id ? edit.icon : item.icon} size={17} /></span>}
                  {edit?.id === item.id ? (
                    <div className="grow stack" style={{ '--gap': '6px' }}>
                      <div className="row wrap" style={{ '--gap': '8px' }}>
                        <div className="grow" style={{ minWidth: 160 }}><Input value={edit.name} onChange={(e) => { setEdit((x) => ({ ...x, name: e.target.value })); setEditErr(''); }} aria-label={tx('Name')} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEdit(null); }} aria-invalid={editErr ? 'true' : undefined} /></div>
                        {tab === 'specialties' && <Select aria-label={tx('Icon')} value={edit.icon} onChange={(e) => setEdit((x) => ({ ...x, icon: e.target.value }))} options={ICON_OPTIONS} style={{ width: 170 }} />}
                        <Button size="sm" icon={Check} onClick={saveEdit} aria-label={tx('Save')} />
                        <Button size="sm" variant="ghost" icon={X} onClick={() => { setEdit(null); setEditErr(''); }} aria-label={tx('Cancel')} />
                      </div>
                      {editErr && <span className="field-error" role="alert">{editErr}</span>}
                    </div>
                  ) : (
                    <>
                      <div className="grow"><div className="strong">{tx(item.name)}</div><div className="tiny muted">{meta.usage(item.usage)}</div></div>
                      {item.usage > 0 && <Badge tone="teal">{tx('In use')}</Badge>}
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEdit({ id: item.id, name: item.name, icon: item.icon })} aria-label={tx('Rename {0}', {
                        0: item.name
                      })} />
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDel(item)} aria-label={tx('Delete {0}', {
                        0: item.name
                      })} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="stack" style={{ '--gap': '20px' }}>
          <form className="panel panel-pad stack" onSubmit={add} noValidate>
            <h2 style={{ fontSize: 16 }}>{tx(meta.addTitle)}</h2>
            <Input value={adding.name} onChange={(e) => { setAdding((a) => ({ ...a, name: e.target.value })); setAddErr(''); }} placeholder={tab === 'specialties' ? tx('e.g. Rheumatology') : tab === 'insurers' ? tx('e.g. Medgulf') : tx('e.g. Spanish')} aria-label={tx(meta.newName)} aria-invalid={addErr ? 'true' : undefined} />
            {tab === 'specialties' && <Select aria-label={tx('Icon')} value={adding.icon} onChange={(e) => setAdding((a) => ({ ...a, icon: e.target.value }))} options={ICON_OPTIONS} />}
            {addErr && <span className="field-error" role="alert">{addErr}</span>}
            <Button type="submit" icon={Plus} disabled={!adding.name.trim()}>{tx(meta.addButton)}</Button>
          </form>
          <div className="panel panel-pad small muted row start" style={{ '--gap': '10px' }}><Library size={18} style={{ flex: 'none', marginTop: 2 }} aria-hidden /><span>{tx(meta.hint)}</span></div>
        </aside>
      </div>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={tx('Delete {0}?', {
        0: del?.name
      })} confirmLabel={tx('Delete')}
        description={del ? (del.usage ? tx(tab === 'insurers' ? 'In use by {0}. It will be removed from their profiles.' : 'In use by {0}.', { 0: meta.usage(del.usage) }) : tx('This entry is not used anywhere.')) : ''}
        onConfirm={async () => { await deleteCatalogItem(tab, del.id); toast.success(tx('{0} deleted', {
          0: del.name
        })); refresh(); }} />
    </div>
  );
}
