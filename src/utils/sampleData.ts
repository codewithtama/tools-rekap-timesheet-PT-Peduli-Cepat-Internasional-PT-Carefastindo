/**
 * Preloaded realistic timesheet sample data for instant 1-click testing
 * Formatted in the exact HTML timesheet format downloaded from the HR system
 */

export interface SampleTimesheet {
  fileName: string;
  projectName: string;
  content: string;
}

export function generateSampleHtmlTimesheet(
  projectCode: string,
  projectName: string,
  payrollCode: string,
  d0Str: string,
  d1Str: string,
  employees: {
    nik: string;
    nama: string;
    jab: string;
    codes: string[];
    g_days?: number[];
    ket?: string;
  }[]
): string {
  const d0 = new Date(d0Str);
  const d1 = new Date(d1Str);
  const days: number[] = [];
  const cur = new Date(d0);
  while (cur <= d1) {
    days.push(cur.getDate());
    cur.setDate(cur.getDate() + 1);
  }

  const thDays = days.map(d => `<th>${d}</th>`).join("");

  let rowsHtml = "";
  employees.forEach((emp, index) => {
    const no = index + 1;
    // Calculate sample system totals for cross check simulation
    const H = emp.codes.filter(c => c.toUpperCase() === "H").length;
    const I = emp.codes.filter(c => c.toUpperCase() === "I").length;
    const A = emp.codes.filter(c => c.toUpperCase() === "A").length;
    const G = emp.g_days ? emp.g_days.length : 0;
    const O = emp.codes.filter(c => c.toUpperCase() === "O").length;
    const S = emp.codes.filter(c => c.toUpperCase() === "S").length;
    const SR = emp.codes.filter(c => c.toUpperCase() === "SR").length;
    const IR = emp.codes.filter(c => c.toUpperCase() === "IR").length;

    // Row 1: No, NIK, Jabatan, codes, sys totals (H, I, A, G, O, S, SR, IR), Keterangan
    const codeCells = emp.codes.map(c => `<td>${c}</td>`).join("");
    const sysCells = `<td>${H}</td><td>${I}</td><td>${A}</td><td>${G}</td><td>${O}</td><td>${S}</td><td>${SR}</td><td>${IR}</td>`;
    rowsHtml += `<tr>
      <td>${no}</td>
      <td>${emp.nik}</td>
      <td>${emp.jab}</td>
      ${codeCells}
      ${sysCells}
      <td>${emp.ket || "-"}</td>
    </tr>`;

    // Row 2 (Sub-row): Empty first cell, Employee Name in 2nd cell, Overtime G codes in date columns
    const gCells = days.map((_, i) => {
      if (emp.g_days && emp.g_days.includes(i)) {
        return `<td>G</td>`;
      }
      return `<td></td>`;
    }).join("");

    rowsHtml += `<tr>
      <td></td>
      <td>${emp.nama}</td>
      <td></td>
      ${gCells}
      <td colspan="9"></td>
    </tr>`;
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Rekapitulasi Absensi</title></head>
<body>
<div>Rekapitulasi Absensi - ${projectName}</div>
<div>Project : ${projectCode} - ${projectName}</div>
<div>Payroll Period Code ${payrollCode}</div>
<div>Periode : ${d0Str} - ${d1Str}</div>

<table id="list_table" border="1">
  <thead>
    <tr>
      <th>No</th>
      <th>NIK</th>
      <th>Jabatan</th>
      ${thDays}
      <th>H</th>
      <th>I</th>
      <th>A</th>
      <th>G</th>
      <th>O</th>
      <th>S</th>
      <th>SR</th>
      <th>IR</th>
      <th>Keterangan</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>
</body>
</html>`;
}

export function getSampleTimesheets(): SampleTimesheet[] {
  // Period: 2026-10-15 to 2026-10-21 (7 days: Thu, Fri, Sat, Sun, Mon, Tue, Wed)
  // Day indices: 0=15, 1=16, 2=17, 3=18(Sun), 4=19, 5=20, 6=21

  const p1Employees = [
    {
      nik: "0901010601",
      nama: "AHMAD SUHADA",
      jab: "Chief Security",
      codes: ["H", "H", "H", "O", "H", "H", "H"],
    },
    {
      nik: "0901010602",
      nama: "BAMBANG HERMANTO",
      jab: "Danru Security",
      // Pattern: Mengapit Off (A, O, A)
      codes: ["H", "H", "A", "O", "A", "H", "H"],
    },
    {
      nik: "0901010603",
      nama: "DEDI KURNIAWAN",
      jab: "Anggota Security",
      // Pattern: Beruntun Alfa (3 days)
      codes: ["A", "A", "A", "O", "H", "H", "H"],
    },
    {
      nik: "0901010604",
      nama: "EKO PRASETYO",
      jab: "Anggota Security",
      // Overtime G on off day
      codes: ["H", "H", "H", "O", "H", "H", "H"],
      g_days: [3],
    },
    {
      nik: "0901010605",
      nama: "FERI GUNAWAN",
      jab: "Cleaning Service",
      // BA Accepted (h) and BA Rejected (a)
      codes: ["H", "h", "H", "O", "H", "a", "H"],
      ket: "Pengajuan BA Kehadiran",
    },
    {
      nik: "0901010606",
      nama: "GITA PERMATASARI",
      jab: "Receptionist",
      // Pattern: Sering Sakit (3 days)
      codes: ["S", "S", "H", "O", "S", "H", "H"],
    },
    {
      nik: "0901010607",
      nama: "HENDRA WIJAYA",
      jab: "Teknisi ME",
      codes: ["H", "H", "I", "O", "H", "H", "H"],
    },
    {
      nik: "0901010608",
      nama: "IWAN SETIAWAN",
      jab: "Gardener",
      codes: ["H", "H", "H", "O", "H", "H", "H"],
    },
  ];

  const p2Employees = [
    {
      nik: "0901012001",
      nama: "JOKO WIDODO",
      jab: "Danru Security",
      codes: ["H", "H", "H", "H", "O", "H", "H"],
    },
    {
      nik: "0901012002",
      nama: "KUSNADI",
      jab: "Anggota Security",
      // Overtime Ganti (2 days)
      codes: ["H", "H", "H", "H", "O", "H", "H"],
      g_days: [4],
    },
    {
      nik: "0901012003",
      nama: "LUKMAN HAKIM",
      jab: "Cleaning Service",
      // Pattern: Sering Izin (3 times: I, IR, I)
      codes: ["I", "IR", "H", "H", "O", "I", "H"],
    },
    {
      nik: "0901012004",
      nama: "MUHAMMAD RIDWAN",
      jab: "Gardener",
      // BA Accepted (h)
      codes: ["H", "H", "h", "H", "O", "H", "H"],
    },
    {
      nik: "0901012005",
      nama: "NURHIDAYAT",
      jab: "Teknisi Sipil",
      codes: ["H", "H", "H", "H", "O", "H", "A"],
    },
  ];

  const p3Employees = [
    {
      nik: "0901011501",
      nama: "OKTOVIANUS",
      jab: "Chief Security",
      codes: ["H", "H", "H", "O", "H", "H", "H"],
    },
    {
      nik: "0901011502",
      nama: "PANJI SAPUTRA",
      jab: "Danru Security",
      // Mengapit Off Sakit (S, O, S)
      codes: ["H", "H", "S", "O", "S", "H", "H"],
    },
    {
      nik: "0901011503",
      nama: "RUDI HARTONO",
      jab: "Anggota Security",
      // BA Rejected (a)
      codes: ["H", "H", "H", "O", "a", "H", "H"],
    },
    {
      nik: "0901011504",
      nama: "SIGIT PURNOMO",
      jab: "Cleaning Service",
      codes: ["H", "H", "H", "O", "H", "H", "H"],
      g_days: [3],
    },
  ];

  return [
    {
      fileName: "timesheet_cirebon_super_blok.xls",
      projectName: "CIREBON SUPER BLOK",
      content: generateSampleHtmlTimesheet(
        "09010106",
        "CIREBON SUPER BLOK",
        "PR202610-01",
        "2026-10-15",
        "2026-10-21",
        p1Employees
      ),
    },
    {
      fileName: "timesheet_gkm_green_tower.xls",
      projectName: "GKM GREEN TOWER",
      content: generateSampleHtmlTimesheet(
        "09010120",
        "GKM GREEN TOWER",
        "PR202610-02",
        "2026-10-15",
        "2026-10-21",
        p2Employees
      ),
    },
    {
      fileName: "timesheet_the_park_sawangan.xls",
      projectName: "THE PARK SAWANGAN",
      content: generateSampleHtmlTimesheet(
        "09010115",
        "THE PARK SAWANGAN",
        "PR202610-03",
        "2026-10-15",
        "2026-10-21",
        p3Employees
      ),
    },
  ];
}
