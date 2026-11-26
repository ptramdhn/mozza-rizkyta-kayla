import Image from "next/image";
import ScrollCat from "./scroll-cat";
import SiteNav from "./site-nav";

const interests = [
  { name: "Ekonomi", description: "Memahami cara keputusan ekonomi membentuk kehidupan dan bisnis." },
  { name: "Keuangan", description: "Mempelajari pengelolaan uang dan perencanaan finansial." },
  { name: "Accounting", description: "Mengenal pencatatan dan analisis sebagai arah profesional." },
];

const assignments = [
  { title: "Tugas 1", url: "https://drive.google.com/file/d/1ThlTwXnpIr0hfQbqix6gMgLOYkW2uZOT/view?usp=drivesdk" },
  { title: "Tugas 2", url: "https://drive.google.com/file/d/1PT2ZX2YNLb2YaHzT--G2xlcpsCw2NNQD/view?usp=drivesdk" },
];

export default function Home() {
  return (
    <main id="beranda">
      <SiteNav />

      <ScrollCat />

      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-text">
          <p className="hello">Halo, aku</p>
          <h1 id="hero-title">Mozza<span>.</span></h1>
          <p className="full-name">Mozza Rizkyta Kayla</p>
          <p className="hero-description">Mahasiswa Manajemen yang sedang menjelajahi dunia ekonomi, keuangan, dan accounting.</p>
          <a className="button" href="#tentang">Kenalan lebih jauh <span aria-hidden="true">↗</span></a>
        </div>
        <div className="hero-image">
          <div className="portrait-backdrop" aria-hidden="true" />
          <div className="portrait-frame">
            <Image src="/images/mozza-ayunan.png" alt="Mozza duduk di ayunan di taman" fill priority sizes="(max-width: 720px) 80vw, 420px" />
          </div>
          <span className="portrait-caption" aria-hidden="true">Salam kenal, Mozza ✳</span>
        </div>
      </section>

      <section className="about shell" id="tentang" aria-labelledby="about-title">
        <div className="about-title"><h2 id="about-title">Sedikit tentang <em>Mozza</em></h2><span className="scribble" aria-hidden="true">✳</span></div>
        <div className="about-content"><p>Aku senang mempelajari bagaimana ekonomi, keuangan, dan manajemen saling berhubungan. Saat ini, aku sedang membangun pemahaman sebagai bekal menuju dunia profesional.</p><div className="facts"><div><span>Domisili</span><strong>Jakarta Timur</strong></div><div><span>Pendidikan</span><strong>Manajemen<br />Universitas Gunadarma</strong></div><div><span>Hal yang kusukai</span><strong>Cat lover</strong></div></div></div>
      </section>

      <section className="interests shell" id="minat" aria-labelledby="interest-title"><div className="section-heading"><h2 id="interest-title">Yang sedang aku pelajari<span>.</span></h2><p>Belajar pelan-pelan, membuka banyak kemungkinan.</p></div><div className="interest-list">{interests.map((item) => <article className="interest-row" key={item.name}><span className="interest-number" aria-hidden="true">✳</span><h3>{item.name}</h3><p>{item.description}</p></article>)}</div></section>

      <section className="assignments shell" id="tugas" aria-labelledby="assignments-title">
        <div className="assignments-intro">
          <h2 id="assignments-title">Tugas kuliah<span>.</span></h2>
          <p>Pengantar Teknologi Sistem Informasi Manajemen</p>
          <p className="assignments-note">Pilih folder untuk membuka tugas di Google Drive.</p>
        </div>
        <div className="assignment-grid">
          {assignments.map((assignment) => (
            <a className="assignment-link" href={assignment.url} key={assignment.title} target="_blank" rel="noopener noreferrer" aria-label={`${assignment.title}, buka di Google Drive (tab baru)`}>
              <svg className="folder-icon" viewBox="0 0 96 78" fill="none" aria-hidden="true"><path d="M7 16a9 9 0 0 1 9-9h22l9 10h33a9 9 0 0 1 9 9v38a9 9 0 0 1-9 9H16a9 9 0 0 1-9-9V16Z" fill="currentColor"/><path d="M7 30h82v34a9 9 0 0 1-9 9H16a9 9 0 0 1-9-9V30Z" fill="var(--folder-front)"/></svg>
              <span className="assignment-title">{assignment.title}</span>
              <span className="assignment-meta">Buka di Google Drive <span aria-hidden="true">↗</span></span>
            </a>
          ))}
        </div>
      </section>

      <section className="direction shell" id="arah"><div><h2>Selangkah lebih dekat ke <em>accounting.</em></h2><p>Aku ingin terus mengeksplorasi dunia keuangan dan manajemen, sambil membangun dasar untuk arah profesional di bidang accounting.</p></div><div className="direction-photo"><Image src="/images/mozza-foto-duduk.png" alt="Mozza duduk santai" fill sizes="(max-width: 720px) 75vw, 340px" /></div></section>
      <footer className="footer shell"><p>Mozza Rizkyta Kayla</p><div className="footer-links"><a href="https://www.instagram.com/mz_r_k13?avpt=MWUwdzMwNGl5d2llYw==" target="_blank" rel="noopener noreferrer" aria-label="Instagram Mozza, buka di tab baru">Instagram <span aria-hidden="true">↗</span></a><a href="#beranda">Kembali ke atas ↑</a></div></footer>
    </main>
  );
}
