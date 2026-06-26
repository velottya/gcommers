<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }

    .page { padding: 32px 40px; }

    /* Header */
    .header { border-bottom: 3px solid #1a6b2b; padding-bottom: 14px; margin-bottom: 18px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .doc-title { font-size: 16px; font-weight: bold; color: #1a6b2b; letter-spacing: 0.04em; text-transform: uppercase; }
    .doc-subtitle { font-size: 10px; color: #555; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 10px; color: #444; line-height: 1.7; }
    .doc-meta strong { color: #1a1a1a; }

    /* Section */
    .section { margin-bottom: 16px; }
    .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #1a6b2b; border-bottom: 1px solid #c8e6c9; padding-bottom: 4px; margin-bottom: 8px; }

    /* Info grid */
    .info-grid { width: 100%; border-collapse: collapse; }
    .info-grid td { padding: 3px 6px 3px 0; vertical-align: top; font-size: 11px; }
    .info-grid td.label { color: #555; width: 140px; }
    .info-grid td.colon { width: 12px; color: #555; }
    .info-grid td.value { color: #1a1a1a; font-weight: 600; }

    /* Items table */
    .items-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    .items-table thead tr { background: #1a6b2b; color: #fff; }
    .items-table thead th { padding: 6px 8px; text-align: left; font-weight: bold; font-size: 10px; letter-spacing: 0.06em; }
    .items-table thead th.right { text-align: right; }
    .items-table tbody tr:nth-child(even) { background: #f4faf5; }
    .items-table tbody td { padding: 5px 8px; border-bottom: 1px solid #e8e8e8; }
    .items-table tbody td.right { text-align: right; }
    .items-table tfoot tr { background: #e8f5e9; font-weight: bold; }
    .items-table tfoot td { padding: 6px 8px; border-top: 2px solid #1a6b2b; }
    .items-table tfoot td.right { text-align: right; }

    /* Summary */
    .summary-wrap { display: flex; justify-content: flex-end; margin-top: 6px; }
    .summary-table { width: 280px; border-collapse: collapse; font-size: 11px; }
    .summary-table td { padding: 3px 6px; }
    .summary-table td.label { color: #555; }
    .summary-table td.right { text-align: right; font-weight: 600; }
    .summary-table tr.total td { border-top: 2px solid #1a6b2b; font-size: 13px; font-weight: bold; color: #1a6b2b; padding-top: 6px; }

    /* Signature */
    .sign-section { margin-top: 28px; }
    .sign-grid { display: flex; justify-content: space-between; }
    .sign-box { width: 42%; text-align: center; }
    .sign-box .sign-label { font-size: 10px; color: #555; margin-bottom: 4px; }
    .sign-box .sign-name { font-weight: bold; font-size: 11px; margin-top: 56px; border-top: 1px solid #444; padding-top: 4px; }
    .sign-box .sign-date { font-size: 9.5px; color: #777; margin-top: 2px; }

    /* Footer */
    .footer { margin-top: 24px; border-top: 1px solid #e0e0e0; padding-top: 8px; font-size: 9px; color: #999; text-align: center; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; }
    .badge-delivered { background: #e8f5e9; color: #1a6b2b; border: 1px solid #a5d6a7; }
    .badge-pending { background: #fff8e1; color: #795548; border: 1px solid #ffe082; }
    .badge-other { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
</style>
</head>
<body>
<div class="page">

    {{-- Header --}}
    <div class="header">
        <div class="header-top">
            <div>
                <div class="doc-title">Bukti Penyerahan Terimaan Pupuk</div>
                <div class="doc-subtitle">Gcommers &mdash; Sistem Penebusan Pupuk</div>
            </div>
            <div class="doc-meta">
                <div><strong>No. Dokumen</strong> : BPTP-{{ $order->PoNumber }}</div>
                <div><strong>Tanggal Cetak</strong> : {{ now()->locale('id')->isoFormat('D MMMM YYYY') }}</div>
                <div>
                    @php
                        $statusBadge = match(strtolower($order->Status ?? '')) {
                            'delivered' => 'badge-delivered',
                            'pending', 'waiting_payment' => 'badge-pending',
                            default => 'badge-other',
                        };
                    @endphp
                    <span class="badge {{ $statusBadge }}">{{ strtoupper($order->Status ?? '—') }}</span>
                </div>
            </div>
        </div>
    </div>

    {{-- Informasi Order --}}
    <div class="section">
        <div class="section-title">Informasi Pemesanan</div>
        <table class="info-grid">
            <tr>
                <td class="label">Nomor PO</td>
                <td class="colon">:</td>
                <td class="value">{{ $order->PoNumber }}</td>
                <td style="width:40px"></td>
                <td class="label">Tanggal Order</td>
                <td class="colon">:</td>
                <td class="value">{{ $order->CreatedAt ? $order->CreatedAt->locale('id')->isoFormat('D MMMM YYYY, HH:mm') : '—' }}</td>
            </tr>
            <tr>
                <td class="label">Email Pembeli</td>
                <td class="colon">:</td>
                <td class="value">{{ $order->UserEmail }}</td>
                <td></td>
                <td class="label">Tanggal Bayar</td>
                <td class="colon">:</td>
                <td class="value">{{ $order->PaidAt ? $order->PaidAt->locale('id')->isoFormat('D MMMM YYYY, HH:mm') : '—' }}</td>
            </tr>
            <tr>
                <td class="label">Vendor / Wilayah</td>
                <td class="colon">:</td>
                <td class="value">{{ $order->Vendor ?? '—' }}</td>
                <td></td>
                <td class="label">Tanggal Terima</td>
                <td class="colon">:</td>
                <td class="value">{{ $order->DeliveredAt ? $order->DeliveredAt->locale('id')->isoFormat('D MMMM YYYY, HH:mm') : '—' }}</td>
            </tr>
            <tr>
                <td class="label">Metode Pembayaran</td>
                <td class="colon">:</td>
                <td class="value">{{ $order->PaymentMethod ?? '—' }}</td>
                <td></td>
                <td class="label">Virtual Account</td>
                <td class="colon">:</td>
                <td class="value">{{ $order->VirtualAccount ?? '—' }}</td>
            </tr>
        </table>
    </div>

    {{-- Daftar Produk --}}
    <div class="section">
        <div class="section-title">Daftar Pupuk yang Diserahterimakan</div>
        @php $items = $order->relationLoaded('items') ? $order->items : collect([]); @endphp
        @if($items->count() > 0)
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width:30px">No</th>
                    <th>Nama Produk</th>
                    <th style="width:90px">Kode</th>
                    <th class="right" style="width:60px">Jumlah</th>
                    <th style="width:50px">Satuan</th>
                    <th class="right" style="width:110px">Harga Satuan</th>
                    <th class="right" style="width:110px">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $i => $item)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $item->productName ?? $item->ProductName ?? '—' }}</td>
                    <td style="font-family:monospace">{{ $item->productCode ?? $item->ProductCode ?? '—' }}</td>
                    <td class="right">{{ $item->quantity ?? $item->Quantity ?? 0 }}</td>
                    <td>{{ $item->unit ?? $item->Unit ?? '' }}</td>
                    <td class="right">{{ number_format($item->unitPrice ?? $item->UnitPrice ?? 0, 0, ',', '.') }}</td>
                    <td class="right">{{ number_format($item->totalPrice ?? $item->TotalPrice ?? 0, 0, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @else
        <p style="color:#999;font-size:10px;padding:8px 0;">Data item tidak tersedia.</p>
        @endif
    </div>

    {{-- Rincian Biaya --}}
    <div class="summary-wrap">
        <table class="summary-table">
            <tr>
                <td class="label">Subtotal</td>
                <td class="right">Rp {{ number_format($order->Subtotal ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td class="label">Biaya Pengiriman</td>
                <td class="right">Rp {{ number_format($order->ShippingAmount ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td class="label">Pajak (PPH/PPN)</td>
                <td class="right">Rp {{ number_format($order->TaxAmount ?? 0, 0, ',', '.') }}</td>
            </tr>
            <tr class="total">
                <td class="label">TOTAL</td>
                <td class="right">Rp {{ number_format($order->TotalAmount ?? 0, 0, ',', '.') }}</td>
            </tr>
        </table>
    </div>

    {{-- Tanda Tangan --}}
    <div class="sign-section">
        <div class="section-title">Tanda Tangan Serah Terima</div>
        <div class="sign-grid">
            <div class="sign-box">
                <div class="sign-label">Penyerah (Vendor / Pengirim)</div>
                <div class="sign-name">( _________________________ )</div>
                <div class="sign-date">Tanggal : ____________________</div>
            </div>
            <div class="sign-box">
                <div class="sign-label">Penerima (Kios / Pembeli)</div>
                <div class="sign-name">( _________________________ )</div>
                <div class="sign-date">Tanggal : ____________________</div>
            </div>
        </div>
    </div>

    {{-- Footer --}}
    <div class="footer">
        Dokumen ini dicetak otomatis oleh Gcommers Admin Console &bull; {{ now()->toDateTimeString() }} &bull; Hanya berlaku sebagai bukti internal
    </div>

</div>
</body>
</html>
