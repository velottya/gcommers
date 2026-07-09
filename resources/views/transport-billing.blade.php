<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 10.5px; color: #111; background: #fff; }
    .page { padding: 22px 40px; }

    /* Letterhead — sama seperti surat-jalan-pengantar / BPTP */
    .letterhead-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 10px; }
    .letterhead-table td { vertical-align: top; padding-bottom: 10px; }
    .letterhead-table img { width: 52px; height: 52px; }
    .letterhead-table .company-cell { padding-left: 16px; }
    .company-name { font-size: 15px; font-weight: bold; letter-spacing: 0.02em; }
    .company-addr { font-size: 10px; margin-top: 1px; }
    .company-phone { font-size: 10px; margin-top: 1px; text-decoration: underline; }
    .doc-ref { text-align: right; }
    .doc-ref .tag-no { font-size: 14px; font-weight: bold; }
    .doc-ref .tag-date { font-size: 9px; color: #555; margin-top: 2px; }

    /* Title */
    .title-wrap { text-align: left; margin: 8px 0 14px; }
    .title-wrap .doc-title { font-size: 14px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; text-decoration: underline; }
    .title-wrap .doc-sub   { font-size: 9.5px; color: #555; margin-top: 3px; }

    /* Parties */
    .parties { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .parties td { vertical-align: top; width: 50%; }
    .party-box { border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; }
    .p-label { font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 4px; }
    .p-name  { font-size: 11.5px; font-weight: bold; }
    .p-sub   { font-size: 9px; color: #64748b; margin-top: 2px; }

    /* Section */
    .sec-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em;
                 color: #0f766e; border-bottom: 1px solid #0f766e; padding-bottom: 4px; margin: 14px 0 8px; }

    /* Summary table */
    .summary-t { width: 100%; border-collapse: collapse; }
    .summary-t td { padding: 3.5px 0; font-size: 10.5px; vertical-align: top; }
    .summary-t .sl { width: 180px; color: #64748b; }
    .summary-t .sc { width: 12px; }
    .summary-t .sv { font-weight: 600; }

    /* Main table */
    .main-t { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 4px; }
    .main-t thead tr { background: #f1f5f9; border-top: 1.5px solid #334155; border-bottom: 1px solid #94a3b8; }
    .main-t thead th { padding: 5px 6px; text-align: left; font-size: 8.5px; font-weight: bold;
                       text-transform: uppercase; letter-spacing: 0.08em; color: #334155; }
    .main-t tbody tr { border-bottom: 1px solid #f1f5f9; }
    .main-t tbody tr:last-child { border-bottom: none; }
    .main-t tbody td { padding: 4.5px 6px; vertical-align: top; }
    .main-t .right { text-align: right; }
    .main-t .mono  { font-family: 'Courier New', monospace; font-size: 8.5px; }
    .main-t .muted { color: #94a3b8; }

    /* Driver block */
    .driver-block { margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; }
    .driver-hdr { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 6px 10px; }
    .driver-name { font-size: 11px; font-weight: bold; }
    .driver-meta { font-size: 9px; color: #64748b; margin-top: 1px; }

    /* Subtotal row */
    .subtotal-row td { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 5px 6px;
                       font-size: 10px; font-weight: bold; }

    /* Grand total */
    .grand-total { width: 100%; border-collapse: collapse; border-top: 2px solid #0f766e;
                   border-bottom: 2px solid #0f766e; margin-top: 2px; }
    .grand-total td { padding: 8px 6px; }
    .grand-total .gt-label { font-size: 12px; font-weight: bold; }
    .grand-total .gt-value  { text-align: right; font-size: 14px; font-weight: bold; color: #0f766e; }

    /* Signatures */
    .sign-t { width: 100%; border-collapse: collapse; margin-top: 28px; }
    .sign-t td { width: 50%; text-align: center; vertical-align: top; }
    .sign-inner { display: inline-block; width: 190px; font-size: 10px; }
    .sign-line { border-bottom: 1px solid #111; margin-top: 52px; margin-bottom: 4px; }
    .sign-name  { font-weight: bold; font-size: 10.5px; }
    .sign-title { font-size: 9px; color: #64748b; }

    /* Footer */
    .footer { margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 6px;
              font-size: 8.5px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="page">

{{-- ══ Letterhead ══ --}}
<table class="letterhead-table">
    <tr>
        <td style="width:52px;"><img src="{{ public_path('logo.png') }}" alt="Logo" /></td>
        <td class="company-cell">
            <div class="company-name">PT. GRESIK CIPTA SEJAHTERA</div>
            <div class="company-addr">Jl. KIG Raya Selatan Blok A5 - Gresik</div>
            <div class="company-phone">Telp. (031) 3985543, 3984822, 3973239</div>
        </td>
        <td class="doc-ref">
            <div class="tag-no">No. TAG-{{ str_pad($billing->id, 5, '0', STR_PAD_LEFT) }}</div>
            <div class="tag-date">Dicetak: {{ now()->locale('id')->isoFormat('D MMMM YYYY, HH:mm') }}</div>
        </td>
    </tr>
</table>

{{-- ══ Title ══ --}}
<div class="title-wrap">
    <div class="doc-title">Tagihan Biaya Pengiriman</div>
    <div class="doc-sub">Periode {{ $periodLabel }}</div>
</div>

{{-- ══ Parties ══ --}}
<table class="parties">
    <tr>
        <td style="padding-right: 8px;">
            <div class="party-box">
                <div class="p-label">Dari (Mitra Transportir)</div>
                <div class="p-name">{{ $billing->company_name }}</div>
                <div class="p-sub">{{ $billing->submitted_by }}</div>
            </div>
        </td>
        <td style="padding-left: 8px;">
            <div class="party-box">
                <div class="p-label">Kepada</div>
                <div class="p-name">GCOMMERS — SuperAdmin</div>
                <div class="p-sub">Pengelola Sistem Distribusi</div>
            </div>
        </td>
    </tr>
</table>

{{-- ══ Summary ══ --}}
<div class="sec-title">Ringkasan Tagihan</div>
<table class="summary-t">
    <tr><td class="sl">Periode Pengiriman</td><td class="sc">:</td><td class="sv">{{ $periodLabel }}</td></tr>
    <tr><td class="sl">Total Pesanan Terkirim</td><td class="sc">:</td><td class="sv">{{ $billing->total_orders }} pesanan</td></tr>
    <tr><td class="sl">Tanggal Pengajuan</td><td class="sc">:</td>
        <td class="sv">{{ $billing->created_at ? \Carbon\Carbon::parse($billing->created_at)->locale('id')->isoFormat('D MMMM YYYY') : '—' }}</td>
    </tr>
    @if($billing->reviewed_by)
    <tr><td class="sl">Ditinjau Oleh</td><td class="sc">:</td><td class="sv">{{ $billing->reviewed_by }}</td></tr>
    <tr><td class="sl">Tanggal Tinjauan</td><td class="sc">:</td>
        <td class="sv">{{ $billing->reviewed_at ? \Carbon\Carbon::parse($billing->reviewed_at)->locale('id')->isoFormat('D MMMM YYYY') : '—' }}</td>
    </tr>
    @endif
    @if($billing->note)
    <tr><td class="sl">Catatan SuperAdmin</td><td class="sc">:</td><td class="sv">{{ $billing->note }}</td></tr>
    @endif
</table>

{{-- ══ Per-driver breakdown ══ --}}
@if(count($driverRows) > 0)
<div class="sec-title">Rincian per Sopir</div>

@foreach($driverRows as $d)
<div class="driver-block">
    {{-- Driver header --}}
    <div class="driver-hdr">
        <div class="driver-name">{{ $d['driver_name'] }}</div>
        @if($d['truck_label'] || $d['police_number'])
        <div class="driver-meta">
            {{ $d['truck_label'] ?: '' }}
            @if($d['police_number']) &nbsp;·&nbsp; Nopol: {{ $d['police_number'] }} @endif
        </div>
        @endif
    </div>

    {{-- Delivery rows for this driver --}}
    <table class="main-t">
        <thead>
            <tr>
                <th style="width:80px">No. Pesanan</th>
                <th>Kiosk</th>
                <th>Produk</th>
                <th class="right">Tonase</th>
                <th class="right">Tarif/kg</th>
                <th class="right">Biaya</th>
                <th class="right" style="width:70px">Tgl. Kirim</th>
            </tr>
        </thead>
        <tbody>
            @foreach($d['rows'] as $row)
            <tr>
                <td class="mono">{{ $row['po_number'] ?? '—' }}</td>
                <td>{{ $row['kiosk_name'] ?? '—' }}</td>
                <td>{{ $row['product_name'] ?? '—' }}</td>
                <td class="right">{{ number_format($row['quota_ton'], 0) }} ton</td>
                <td class="right muted">
                    @if($row['rate_per_kg'] !== null)
                        Rp {{ number_format($row['rate_per_kg'], 0, ',', '.') }}
                    @else —
                    @endif
                </td>
                <td class="right">
                    @if($row['cost'] !== null)
                        Rp {{ number_format($row['cost'], 0, ',', '.') }}
                    @else <span class="muted">—</span>
                    @endif
                </td>
                <td class="right muted">
                    {{ $row['delivered_at'] ? \Carbon\Carbon::parse($row['delivered_at'])->locale('id')->isoFormat('D MMM YY') : '—' }}
                </td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr class="subtotal-row">
                <td colspan="5" style="text-align:right;">Subtotal {{ $d['driver_name'] }}</td>
                <td class="right">
                    @if($d['subtotal'] > 0)
                        <strong>Rp {{ number_format($d['subtotal'], 0, ',', '.') }}</strong>
                    @else <span class="muted">—</span>
                    @endif
                </td>
                <td></td>
            </tr>
        </tfoot>
    </table>
</div>
@endforeach

{{-- ══ Grand total ══ --}}
<table class="grand-total">
    <tr>
        <td class="gt-label">Total Biaya Pengiriman</td>
        <td class="gt-value">Rp {{ number_format($billing->total_shipping, 0, ',', '.') }}</td>
    </tr>
</table>

@else
{{-- No shipment detail available — fall back to order list --}}
<div class="sec-title">Daftar Pesanan</div>
<table class="main-t">
    <thead>
        <tr>
            <th>#</th>
            <th>No. Pesanan</th>
            <th>Kiosk</th>
            <th class="right">Tgl. Terkirim</th>
        </tr>
    </thead>
    <tbody>
        @foreach($orderList as $i => $o)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td class="mono">{{ $o['po_number'] }}</td>
            <td>{{ $o['kiosk_name'] }}</td>
            <td class="right muted">{{ $o['delivered_at'] ? \Carbon\Carbon::parse($o['delivered_at'])->locale('id')->isoFormat('D MMM YYYY') : '—' }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<table class="grand-total" style="margin-top:8px;">
    <tr>
        <td class="gt-label">Total Biaya Pengiriman</td>
        <td class="gt-value">Rp {{ number_format($billing->total_shipping, 0, ',', '.') }}</td>
    </tr>
</table>
@endif

{{-- ══ Signatures ══ --}}
<table class="sign-t">
    <tr>
        <td>
            <div class="sign-inner">
                <div style="font-size:9px; color:#94a3b8; margin-bottom:2px;">Yang Mengajukan,</div>
                <div class="sign-line"></div>
                <div class="sign-name">{{ $billing->company_name }}</div>
                <div class="sign-title">Mitra Transportir</div>
            </div>
        </td>
        <td>
            <div class="sign-inner">
                <div style="font-size:9px; color:#94a3b8; margin-bottom:2px;">Yang Menyetujui,</div>
                <div class="sign-line"></div>
                <div class="sign-name">{{ $billing->reviewed_by ?: 'SuperAdmin GCOMMERS' }}</div>
                <div class="sign-title">Pengelola Sistem</div>
            </div>
        </td>
    </tr>
</table>

<div class="footer">
    Dokumen ini digenerate otomatis oleh sistem GCOMMERS &nbsp;&mdash;&nbsp; {{ now()->isoFormat('D MMMM YYYY HH:mm') }}
    &nbsp;&mdash;&nbsp; No. TAG-{{ str_pad($billing->id, 5, '0', STR_PAD_LEFT) }}
</div>

</div>
</body>
</html>
