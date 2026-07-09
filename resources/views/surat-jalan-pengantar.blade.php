<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }

    .page { padding: 28px 36px; }

    /* DomPDF tidak mendukung CSS flexbox dengan andal — semua layout
       multi-kolom di bawah sengaja pakai <table>, bukan display:flex. */

    .letterhead-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 6px; }
    .letterhead-table td { vertical-align: top; padding-bottom: 10px; }
    .letterhead-table img { width: 52px; height: 52px; }
    .letterhead-table .company-cell { padding-left: 16px; }
    .company-name { font-size: 15px; font-weight: bold; letter-spacing: 0.02em; }
    .company-addr { font-size: 10px; margin-top: 1px; }
    .company-phone { font-size: 10px; margin-top: 1px; text-decoration: underline; }
    .doc-no { text-align: right; }
    .doc-no .no-label { font-size: 20px; font-weight: bold; }

    .title-block { text-align: left; margin: 8px 0 14px; }
    .title-block .doc-title { font-size: 14px; font-weight: bold; letter-spacing: 0.06em; text-decoration: underline; }
    .title-block .doc-subtitle { font-size: 9.5px; margin-top: 1px; }

    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .meta-table td { vertical-align: top; }
    .meta-right { text-align: right; }
    .kepada .kepada-name { font-weight: bold; font-size: 12px; text-decoration: underline; }
    .kepada .kepada-addr { font-size: 10.5px; margin-top: 2px; }
    .kepada .kepada-di { font-weight: bold; font-size: 11px; margin-top: 2px; text-decoration: underline; }

    .ship-info { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
    .ship-info td { padding: 2px 0; vertical-align: top; }
    .ship-info td.label { width: 140px; }
    .ship-info td.colon { width: 14px; }

    .items-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 10px; }
    .items-table thead tr { border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; }
    .items-table thead th { padding: 5px 6px; text-align: left; font-weight: bold; }
    .items-table thead th.right { text-align: right; }
    .items-table tbody td { padding: 5px 6px; }
    .items-table tbody td.right { text-align: right; }

    .footer-table { width: 100%; border-collapse: collapse; border-top: 1px solid #111; padding-top: 8px; margin-top: 26px; }
    .footer-table td { vertical-align: top; padding-top: 8px; font-size: 11px; line-height: 1.6; }

    .catatan { margin-top: 18px; font-size: 9.5px; }
    .catatan .catatan-title { font-weight: bold; text-decoration: underline; }
    .catatan ol { margin-left: 14px; margin-top: 2px; }

    .sign-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .sign-table td { width: 33.33%; text-align: center; font-size: 10.5px; vertical-align: top; }
    .sign-line { display: inline-block; width: 160px; height: 1px; border-bottom: 1px solid #111; margin-top: 38px; }
    .sign-table .sign-name { font-weight: bold; display: block; margin-top: 4px; }
</style>
</head>
<body>
<div class="page">

    <table class="letterhead-table">
        <tr>
            <td style="width:52px;"><img src="{{ public_path('logo.png') }}" alt="Logo" /></td>
            <td class="company-cell">
                <div class="company-name">PT. GRESIK CIPTA SEJAHTERA</div>
                <div class="company-addr">Jl. KIG Raya Selatan Blok A5 - Gresik</div>
                <div class="company-phone">Telp. (031) 3985543, 3984822, 3973239</div>
            </td>
            <td class="doc-no"><div class="no-label">No. {{ $order->PoNumber }}</div></td>
        </tr>
    </table>

    <div class="title-block">
        <div class="doc-title">SURAT PENGANTAR</div>
        <div class="doc-subtitle">Surat Jalan Pengiriman Barang</div>
    </div>

    <table class="meta-table">
        <tr>
            <td class="kepada">
                <div>Kepada Yth.</div>
                <div class="kepada-name">{{ $kiosk?->KioskName ?: $kiosk?->DisplayName ?: '—' }}</div>
                <div class="kepada-addr">{{ $kiosk?->Address ?: '—' }}</div>
                <div>Di</div>
                <div class="kepada-di">{{ $kiosk?->kecamatan?->nama_kec ?? '—' }}, {{ $kiosk?->kabupaten?->nama_kab ?? '—' }}</div>
            </td>
            <td class="meta-right">Tanggal : {{ now()->locale('id')->isoFormat('D-MM-YYYY') }}</td>
        </tr>
    </table>

    <table class="ship-info">
        <tr>
            <td class="label">Kendaraan No. Pol</td>
            <td class="colon">:</td>
            <td>{{ $shipment->PoliceNumber ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Barang EX</td>
            <td class="colon">:</td>
            <td>PETROKIMIA GRESIK, PT</td>
        </tr>
        <tr>
            <td class="label">Nomor SO</td>
            <td class="colon">:</td>
            <td><strong>{{ $soCode ?? '—' }}</strong></td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width:34px;">NO</th>
                <th>URAIAN BARANG</th>
                <th class="right" style="width:90px;">JUMLAH</th>
                <th style="width:90px;">SATUAN</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>1</td>
                <td>{{ $shipment->ProductCode ? $shipment->ProductCode . ' — ' : '' }}{{ $shipment->ProductName ?? '—' }}</td>
                <td class="right">{{ $shipment->QuotaTon !== null ? number_format((float) $shipment->QuotaTon, 2, ',', '.') : '—' }}</td>
                <td>TON</td>
            </tr>
        </tbody>
    </table>

    <table class="footer-table">
        <tr>
            <td>
                <div>Pemilik : {{ $kiosk?->PicName ?: '—' }}</div>
                <div>Telp&nbsp;&nbsp;&nbsp;: {{ $kiosk?->Phone ?: '—' }}</div>
            </td>
            <td>
                <div>GP : {{ $order->gudangSubmission?->nama_gudang ?? '—' }}</div>
            </td>
        </tr>
    </table>

    <div class="catatan">
        <div class="catatan-title">Catatan :</div>
        <ol>
            <li>Dilarang menjual di atas HET, sesuai SK mentan.</li>
            <li>Dilarang menjual antar kios, industri, dan di luar peruntukannya.</li>
            <li>Harap menyimpan surat pengantar ini sebagai arsip.</li>
            <li>Surat pengantar ini sebagai Nota Penjualan.</li>
        </ol>
    </div>

    <table class="sign-table">
        <tr>
            <td>
                <div>Penerima,</div>
                <div class="sign-line"></div>
            </td>
            <td>
                <div>Tanda Tangan,</div>
                <div>Sopir/Pembawa</div>
                <div class="sign-line"></div>
                <span class="sign-name">{{ $shipment->DriverName ?? '—' }}</span>
            </td>
            <td>
                <div>Pengirim,</div>
                <div class="sign-line"></div>
            </td>
        </tr>
    </table>

</div>
</body>
</html>
