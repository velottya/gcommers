<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 12px; color: #000; background: #fff; }

    .page { padding: 22px 50px; }

    /* Header */
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .header-table td { vertical-align: middle; }
    .header-table .logo-cell { width: 260px; padding-right: 44px; }
    .header-table .logo-cell img { width: 240px; height: 98px; }
    .header-table .title-cell { text-align: center; }
    .doc-title { font-size: 26px; font-weight: bold; }

    /* Kepada */
    .kepada { margin-bottom: 10px; font-size: 13px; line-height: 1.4; }
    .kepada .kepada-target { font-weight: bold; }

    /* Intro paragraph */
    .intro { margin-bottom: 12px; font-size: 12.5px; line-height: 1.5; }

    /* Items table */
    .items-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .items-table th, .items-table td { border: 1px solid #000; padding: 5px 10px; }
    .items-table th { text-align: center; font-weight: bold; }
    .items-table td.no-cell { width: 60px; text-align: center; vertical-align: top; }
    .items-table td.no-cell div { padding: 1px 0; }
    .items-table td.mid { vertical-align: middle; text-align: center; }
    .items-table td.qty-cell { width: 160px; vertical-align: middle; text-align: center; }
    .items-table .total-row td { font-weight: bold; text-align: center; }
    .items-table .total-row td.total-label { text-align: right; padding-right: 18px; }

    /* Info fields */
    .info-table { width: 55%; border-collapse: collapse; margin-top: 14px; font-size: 12.5px; }
    .info-table td { padding: 3px 0; vertical-align: top; }
    .info-table td.label { width: 150px; }
    .info-table td.colon { width: 16px; }
    .info-table td.value { font-weight: bold; }
    .footnote { font-size: 10.5px; margin-top: 4px; color: #333; }

    /* Signatures */
    .sign-labels { width: 100%; border-collapse: collapse; margin-top: 18px; }
    .sign-labels td { width: 33.33%; text-align: center; font-size: 12.5px; padding-bottom: 6px; }

    .sign-boxes { width: 100%; border-collapse: collapse; }
    .sign-boxes td { width: 33.33%; border: 1px solid #000; height: 92px; text-align: center; vertical-align: top; padding: 10px 8px; font-size: 12px; }
    .sign-boxes .role { font-weight: bold; text-transform: uppercase; }
    .sign-boxes .sign-name { margin-top: 50px; }

    .doc-ref { margin-top: 14px; font-size: 10px; font-weight: bold; }
</style>
</head>
<body>
<div class="page">

    {{-- Header --}}
    <table class="header-table">
        <tr>
            <td class="logo-cell"><img src="{{ public_path('logo-pg.png') }}" alt="Logo Petrokimia Gresik" /></td>
            <td class="title-cell"><div class="doc-title">PENGANTAR PENGAMBILAN BARANG</div></td>
        </tr>
    </table>

    {{-- Kepada --}}
    <div class="kepada">
        <div>Kepada Yth.</div>
        <div>Kepala Gudang Penyangga</div>
        <div class="kepada-target">PT. PETROKIMIA GRESIK</div>
    </div>

    {{-- Intro --}}
    <div class="intro">
        Dengan ini kami sampaikan pengambilan barang pada tanggal
        <strong>{{ $shipment->MuatInCompletedAt ? $shipment->MuatInCompletedAt->locale('id')->isoFormat('D MMMM YYYY') : now()->locale('id')->isoFormat('D MMMM YYYY') }}</strong>
        dengan rincian sebagai berikut :
    </div>

    {{-- Items --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width:60px">NO</th>
                <th style="width:220px">NO. SALES ORDER</th>
                <th>PRODUK</th>
                <th style="width:160px">KUANTITAS</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="no-cell">
                    <div>1.</div>
                    <div>2.</div>
                    <div>3.</div>
                    <div>4.</div>
                </td>
                <td class="mid">{{ $soCode ?? '—' }}</td>
                <td class="mid">{{ $shipment->ProductName ?? '—' }}</td>
                <td class="qty-cell">{{ number_format((float) $shipment->QuotaTon, 2, ',', '.') }} TON</td>
            </tr>
        </tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="3" class="total-label">TOTAL</td>
                <td>{{ number_format((float) $shipment->QuotaTon, 2, ',', '.') }} TON</td>
            </tr>
        </tfoot>
    </table>

    {{-- Info fields --}}
    <table class="info-table">
        <tr>
            <td class="label">Pembeli / Distributor</td>
            <td class="colon">:</td>
            <td class="value">{{ $kiosk->KioskName ?? $kiosk->DisplayName ?? '—' }}</td>
        </tr>
        @php
            $truckType = $shipment->TruckLabel ? trim(preg_replace('/\s*\(.*\)\s*$/', '', $shipment->TruckLabel)) : '';
        @endphp
        <tr>
            <td class="label">Alat Angkut</td>
            <td class="colon">:</td>
            <td class="value">{{ $truckType ?: 'Truk / Truk Gandeng / Pick-Up / Kontainer' }} *)</td>
        </tr>
        <tr>
            <td class="label">No. Polisi</td>
            <td class="colon">:</td>
            <td class="value">{{ $shipment->PoliceNumber ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Nama Sopir</td>
            <td class="colon">:</td>
            <td class="value">{{ $shipment->DriverName ? strtoupper($shipment->DriverName) : '—' }}</td>
        </tr>
    </table>
    <div class="footnote">*) Coret yang tidak perlu</div>

    {{-- Signatures --}}
    <table class="sign-labels">
        <tr>
            <td>Mengetahui :</td>
            <td>Pihak yang mengambil :</td>
            <td>Pihak yang melayani :</td>
        </tr>
    </table>
    <table class="sign-boxes">
        <tr>
            <td>
                <div class="role">Pembeli / Distributor</div>
                <div class="sign-name">( {{ $kiosk->KioskName ?? $kiosk->DisplayName ?? '' }} )</div>
            </td>
            <td>
                <div class="role">Expeditur / Sopir</div>
                <div class="sign-name">{{ $shipment->DriverName ? '( ' . strtoupper($shipment->DriverName) . ' )' : '( )' }}</div>
            </td>
            <td>
                <div class="role">Kepala Gudang</div>
                <div class="sign-name">( )</div>
            </td>
        </tr>
    </table>

    <div class="doc-ref">#{{ $shipment->ShipmentNumber ?? $order->PoNumber }}</div>

</div>
</body>
</html>
