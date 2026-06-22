<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }

    .page { padding: 32px 40px; }

    .header { border-bottom: 3px solid #1565c0; padding-bottom: 14px; margin-bottom: 18px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .doc-title { font-size: 16px; font-weight: bold; color: #1565c0; letter-spacing: 0.04em; text-transform: uppercase; }
    .doc-subtitle { font-size: 10px; color: #555; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 10px; color: #444; line-height: 1.7; }
    .doc-meta strong { color: #1a1a1a; }

    .section { margin-bottom: 16px; }
    .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #1565c0; border-bottom: 1px solid #bbdefb; padding-bottom: 4px; margin-bottom: 8px; }

    .info-grid { width: 100%; border-collapse: collapse; }
    .info-grid td { padding: 3px 6px 3px 0; vertical-align: top; font-size: 11px; }
    .info-grid td.label { color: #555; width: 140px; }
    .info-grid td.colon { width: 12px; color: #555; }
    .info-grid td.value { color: #1a1a1a; font-weight: 600; }

    .route-box { display: flex; justify-content: space-between; gap: 16px; }
    .route-card { flex: 1; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px 12px; }
    .route-card .route-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #1565c0; font-weight: bold; }
    .route-card .route-name { font-size: 12px; font-weight: bold; margin-top: 4px; }
    .route-card .route-addr { font-size: 10px; color: #555; margin-top: 2px; }
    .route-card .route-coord { font-size: 9px; color: #999; margin-top: 4px; font-family: monospace; }

    .sign-section { margin-top: 28px; }
    .sign-grid { display: flex; justify-content: space-between; }
    .sign-box { width: 30%; text-align: center; }
    .sign-box .sign-label { font-size: 10px; color: #555; margin-bottom: 4px; }
    .sign-box .sign-name { font-weight: bold; font-size: 11px; margin-top: 56px; border-top: 1px solid #444; padding-top: 4px; }
    .sign-box .sign-date { font-size: 9.5px; color: #777; margin-top: 2px; }

    .footer { margin-top: 24px; border-top: 1px solid #e0e0e0; padding-top: 8px; font-size: 9px; color: #999; text-align: center; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; }
    .badge-selesai { background: #e8f5e9; color: #1a6b2b; border: 1px solid #a5d6a7; }
    .badge-jalan { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
    .badge-siap { background: #fff8e1; color: #795548; border: 1px solid #ffe082; }
</style>
</head>
<body>
<div class="page">

    <div class="header">
        <div class="header-top">
            <div>
                <div class="doc-title">Surat Jalan</div>
                <div class="doc-subtitle">Gcommers &mdash; Sistem Penebusan Pupuk</div>
            </div>
            <div class="doc-meta">
                <div><strong>No. Surat Jalan</strong> : {{ $shipment->ShipmentNumber }}</div>
                <div><strong>No. PO</strong> : {{ $order->PoNumber }}</div>
                <div><strong>Tanggal Cetak</strong> : {{ now()->locale('id')->isoFormat('D MMMM YYYY') }}</div>
                <div>
                    @php
                        $statusBadge = match($shipment->Status) {
                            'selesai' => 'badge-selesai',
                            'dalam_perjalanan' => 'badge-jalan',
                            default => 'badge-siap',
                        };
                        $statusLabel = match($shipment->Status) {
                            'selesai' => 'Selesai',
                            'dalam_perjalanan' => 'Dalam Perjalanan',
                            default => 'Siap Muat',
                        };
                    @endphp
                    <span class="badge {{ $statusBadge }}">{{ $statusLabel }}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Informasi Pengiriman</div>
        <table class="info-grid">
            <tr>
                <td class="label">Sopir</td>
                <td class="colon">:</td>
                <td class="value">{{ $shipment->DriverName ?? '—' }}</td>
                <td style="width:40px"></td>
                <td class="label">Email Transportir</td>
                <td class="colon">:</td>
                <td class="value">{{ $shipment->TransportirEmail ?? '—' }}</td>
            </tr>
            <tr>
                <td class="label">Kendaraan</td>
                <td class="colon">:</td>
                <td class="value">{{ $shipment->TruckLabel ?? '—' }}</td>
                <td></td>
                <td class="label">No. Polisi</td>
                <td class="colon">:</td>
                <td class="value">{{ $shipment->PoliceNumber ?? '—' }}</td>
            </tr>
            <tr>
                <td class="label">Muat Berangkat</td>
                <td class="colon">:</td>
                <td class="value">{{ $shipment->MuatInCompletedAt ? $shipment->MuatInCompletedAt->locale('id')->isoFormat('D MMMM YYYY, HH:mm') : 'Belum' }}</td>
                <td></td>
                <td class="label">Muat Tiba</td>
                <td class="colon">:</td>
                <td class="value">{{ $shipment->MuatOutCompletedAt ? $shipment->MuatOutCompletedAt->locale('id')->isoFormat('D MMMM YYYY, HH:mm') : 'Belum' }}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Rute</div>
        <div class="route-box">
            <div class="route-card">
                <div class="route-label">Asal &mdash; Gudang</div>
                <div class="route-name">{{ $shipment->warehouse?->name ?? '—' }}</div>
                <div class="route-addr">{{ $shipment->warehouse?->address ?? '—' }}</div>
                @if($shipment->OriginLat && $shipment->OriginLng)
                <div class="route-coord">{{ $shipment->OriginLat }}, {{ $shipment->OriginLng }}</div>
                @endif
            </div>
            <div class="route-card">
                <div class="route-label">Tujuan &mdash; Kios</div>
                <div class="route-name">{{ $shipment->DestinationLabel ?? '—' }}</div>
                <div class="route-addr">{{ $shipment->DestinationAddress ?? '—' }}</div>
                @if($shipment->DestinationLat && $shipment->DestinationLng)
                <div class="route-coord">{{ $shipment->DestinationLat }}, {{ $shipment->DestinationLng }}</div>
                @endif
            </div>
        </div>
    </div>

    @if($shipment->Note)
    <div class="section">
        <div class="section-title">Catatan</div>
        <p style="font-size:11px;">{{ $shipment->Note }}</p>
    </div>
    @endif

    <div class="sign-section">
        <div class="section-title">Tanda Tangan</div>
        <div class="sign-grid">
            <div class="sign-box">
                <div class="sign-label">Pengirim (Gudang)</div>
                <div class="sign-name">( _____________ )</div>
                <div class="sign-date">Tanggal : __________</div>
            </div>
            <div class="sign-box">
                <div class="sign-label">Sopir</div>
                <div class="sign-name">( _____________ )</div>
                <div class="sign-date">Tanggal : __________</div>
            </div>
            <div class="sign-box">
                <div class="sign-label">Penerima (Kios)</div>
                <div class="sign-name">( _____________ )</div>
                <div class="sign-date">Tanggal : __________</div>
            </div>
        </div>
    </div>

    <div class="footer">
        Dokumen ini dicetak otomatis oleh Gcommers Admin Console &bull; {{ now()->toDateTimeString() }} &bull; Hanya berlaku sebagai bukti internal
    </div>

</div>
</body>
</html>
