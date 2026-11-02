const $ = (id) => document.getElementById(id);
const fields = ['tanggal','perusahaan','posisi','lokasi','sumber','status','tahap','kontak','tautan','catatan'];
const STORAGE_KEY = 'jobtrack_data';
let jobs = [];

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  jobs = Array.isArray(saved) ? saved : [];
} catch (error) {
  console.warn('Data JobTrack tidak dapat dibaca:', error);
  jobs = [];
}

const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch (error) {
    alert('Penyimpanan browser penuh atau tidak tersedia. Silakan ekspor data sebagai cadangan.');
  }
}

function updateDate() {
  $('todayLabel').textContent = new Intl.DateTimeFormat('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  }).format(new Date());
}

function updateStats() {
  const count = (status) => jobs.filter(job => job.status === status).length;
  $('total').textContent = jobs.length;
  $('proses').textContent = count('Dalam Proses');
  $('diterima').textContent = count('Diterima');
  $('ditolak').textContent = count('Ditolak');
  $('mundur').textContent = count('Mundur');
  $('tidakAdaKabar').textContent = count('Tidak Ada Kabar');
}

function updatePositionFilter() {
  const previous = $('filterPosisi').value;
  const positions = [...new Set(jobs.map(job => job.posisi).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, 'id'));
  $('filterPosisi').innerHTML = '<option value="">Semua Posisi</option>' +
    positions.map(position => `<option value="${escapeHTML(position)}">${escapeHTML(position)}</option>`).join('');
  $('filterPosisi').value = positions.includes(previous) ? previous : '';
}

function statusClass(status) {
  return ({
    'Dalam Proses':'proses',
    'Diterima':'diterima',
    'Ditolak':'ditolak',
    'Mundur':'mundur',
    'Tidak Ada Kabar':'silent'
  })[status] || '';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value + 'T00:00:00');
  return Number.isNaN(date.getTime()) ? escapeHTML(value) :
    new Intl.DateTimeFormat('id-ID', {day:'2-digit', month:'short', year:'numeric'}).format(date);
}

function render() {
  updateStats();
  updatePositionFilter();

  const query = $('search').value.trim().toLocaleLowerCase('id');
  const position = $('filterPosisi').value;
  const status = $('filterStatus').value;
  const direction = $('sortDate').value;

  const visible = jobs.filter(job => {
    const searchable = [job.perusahaan, job.posisi, job.lokasi, job.catatan, job.sumber]
      .join(' ').toLocaleLowerCase('id');
    return (!query || searchable.includes(query)) &&
      (!position || job.posisi === position) &&
      (!status || job.status === status);
  }).sort((a,b) => direction === 'new'
    ? (b.tanggal || '').localeCompare(a.tanggal || '')
    : (a.tanggal || '').localeCompare(b.tanggal || ''));

  $('visibleCount').textContent = visible.length;
  $('jobRows').innerHTML = visible.map(job => {
    const safeId = escapeHTML(job.id);
    const link = job.tautan && /^https?:\/\//i.test(job.tautan)
      ? `<a class="link" href="${escapeHTML(job.tautan)}" target="_blank" rel="noopener noreferrer">Buka tautan</a>` : '';
    return `<tr>
      <td>${formatDate(job.tanggal)}</td>
      <td><strong>${escapeHTML(job.perusahaan)}</strong><span class="muted">${escapeHTML(job.lokasi || 'Lokasi tidak dicantumkan')}</span></td>
      <td><strong>${escapeHTML(job.posisi)}</strong></td>
      <td><span class="pill ${statusClass(job.status)}">${escapeHTML(job.status)}</span></td>
      <td>${escapeHTML(job.tahap || '-')}</td>
      <td>${escapeHTML(job.sumber || '-')}</td>
      <td>${escapeHTML(job.catatan || '-')}<span class="muted">${link}</span></td>
      <td><div class="row-actions"><button class="btn rowbtn edit-btn" data-action="edit" data-id="${safeId}">Edit</button><button class="btn rowbtn delete-btn" data-action="delete" data-id="${safeId}">Hapus</button></div></td>
    </tr>`;
  }).join('');

  $('empty').hidden = visible.length > 0;
}

function resetForm() {
  $('jobForm').reset();
  $('editId').value = '';
  $('formTitle').textContent = 'Tambah Lamaran Pekerjaan';
  $('saveBtn').innerHTML = 'Simpan Lamaran <span>＋</span>';
  $('cancelEdit').hidden = true;
}

$('jobForm').addEventListener('submit', event => {
  event.preventDefault();
  const id = $('editId').value;
  const record = { id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) };
  fields.forEach(field => record[field] = $(field).value.trim());

  if (id) {
    jobs = jobs.map(job => job.id === id ? record : job);
  } else {
    jobs.push(record);
  }

  persist();
  resetForm();
  render();
});

function editJob(id) {
  const record = jobs.find(job => job.id === id);
  if (!record) return;
  fields.forEach(field => $(field).value = record[field] || '');
  $('editId').value = id;
  $('formTitle').textContent = 'Edit Data Lamaran';
  $('saveBtn').innerHTML = 'Simpan Perubahan <span>✓</span>';
  $('cancelEdit').hidden = false;
  window.scrollTo({top:0, behavior:'smooth'});
}

function deleteJob(id) {
  const record = jobs.find(job => job.id === id);
  if (!record || !confirm(`Hapus lamaran ${record.perusahaan} — ${record.posisi}?`)) return;
  jobs = jobs.filter(job => job.id !== id);
  persist();
  render();
}

$('jobRows').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === 'edit') editJob(id);
  if (button.dataset.action === 'delete') deleteJob(id);
});

$('cancelEdit').addEventListener('click', resetForm);
['search','filterPosisi','filterStatus','sortDate'].forEach(id => {
  $(id).addEventListener(id === 'search' ? 'input' : 'change', render);
});

$('clearBtn').addEventListener('click', () => {
  if (!jobs.length) return;
  if (confirm('Yakin ingin menghapus seluruh data lamaran? Sebaiknya ekspor CSV terlebih dahulu.')) {
    jobs = [];
    persist();
    resetForm();
    render();
  }
});

$('exportBtn').addEventListener('click', () => {
  const headers = ['Tanggal Melamar','Perusahaan','Posisi','Lokasi','Sumber','Status','Tahap Seleksi','Kontak/HRD','Link','Catatan'];
  const rows = jobs.map(job => fields.map(field => job[field] || ''));
  const csv = [headers, ...rows].map(row =>
    row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(';')
  ).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'rekap-lamaran-pekerjaan.csv';
  anchor.click();
  URL.revokeObjectURL(url);
});

$('printBtn').addEventListener('click', () => window.print());

updateDate();
render();
