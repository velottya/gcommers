<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductRegionPrice;
use App\Models\ProductStockRequest;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ProductStockRequestController extends Controller
{
    /**
     * AdminRegion → daftar ajuan milik sendiri (filter by requested_by).
     * SuperAdmin   → semua ajuan dari semua region (opsional filter status).
     */
    public function index(Request $request)
    {
        $user  = Auth::user();
        $query = ProductStockRequest::query()->orderByDesc('created_at');

        if ($user->Role === 'AdminRegion') {
            $query->where('requested_by', $user->Email);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Kembalikan harga + stok region yang tersimpan untuk produk + region AdminRegion saat ini.
     * Digunakan sebagai nilai awal form ajuan stok.
     */
    public function currentPrice(string $productId)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403);

        $price = ProductRegionPrice::where('product_id', $productId)
                                   ->where('region', $user->Region ?? '')
                                   ->first();

        if (!$price) {
            $settings = Setting::allAsMap();
            return response()->json([
                'qty_available'          => 0,
                'harga_satuan'           => 0,
                'biaya_pengiriman_per_kg'=> 0,
                'pajak_pph_persen'       => (float) ($settings['pph_persen']['value'] ?? 0.25),
            ]);
        }

        return response()->json([
            'qty_available'          => (float) $price->qty_available,
            'harga_satuan'           => (float) $price->harga_satuan,
            'biaya_pengiriman_per_kg'=> (float) $price->biaya_pengiriman_per_kg,
            'pajak_pph_persen'       => (float) $price->pajak_pph_persen,
        ]);
    }

    /**
     * AdminRegion mengajukan penambahan stok beserta harga dan biaya ongkir per kg.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'AdminRegion', 403, 'Hanya AdminRegion yang dapat mengajukan stok.');

        $validated = $request->validate([
            'product_id'            => 'required|integer|exists:product_master,id',
            'qty_requested'         => 'required|integer|min:1',
            'harga_satuan'          => 'required|numeric|min:0',
            'biaya_pengiriman_per_kg'=> 'required|numeric|min:0',
            'pajak_pph_persen'      => 'nullable|numeric|min:0|max:100',
            'notes'                 => 'nullable|string|max:1000',
        ]);

        $product  = Product::findOrFail($validated['product_id']);
        $settings = Setting::allAsMap();

        $req = ProductStockRequest::create([
            'product_id'            => $product->id,
            'product_name'          => $product->nama_produk,
            'product_code'          => $product->kode_produk,
            'region'                => $user->Region ?? 'Unknown',
            'qty_requested'         => $validated['qty_requested'],
            'harga_satuan'          => $validated['harga_satuan'],
            'biaya_pengiriman_per_kg'=> $validated['biaya_pengiriman_per_kg'],
            'pajak_pph_persen'      => $validated['pajak_pph_persen']
                                        ?? (float) ($settings['pph_persen']['value'] ?? 0.25),
            'notes'                 => $validated['notes'] ?? null,
            'status'                => 'submitted',
            'requested_by'          => $user->Email,
        ]);

        return response()->json($req, 201);
    }

    /**
     * SuperAdmin menyetujui ajuan:
     *  - product_region_prices diperbarui: harga + ongkir + PPH
     *  - qty_available region bertambah sebesar qty_requested
     */
    public function approve(Request $request, string $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Hanya SuperAdmin yang dapat menyetujui.');

        $req = ProductStockRequest::findOrFail($id);
        abort_if($req->status !== 'submitted', 422, 'Ajuan ini sudah diproses sebelumnya.');

        DB::transaction(function () use ($req, $user, $request) {
            $req->update([
                'status'      => 'approved',
                'reviewed_by' => $user->Email,
                'reviewed_at' => now(),
                'review_note' => $request->input('review_note'),
            ]);

            // Perbarui harga + ongkir + PPH region untuk produk ini.
            // qty_available tidak disertakan agar tidak di-reset saat update.
            ProductRegionPrice::updateOrCreate(
                [
                    'product_id' => $req->product_id,
                    'region'     => $req->region,
                ],
                [
                    'product_name'           => $req->product_name,
                    'product_code'           => $req->product_code,
                    'harga_satuan'           => $req->harga_satuan,
                    'biaya_pengiriman_per_kg'=> $req->biaya_pengiriman_per_kg,
                    'pajak_pph_persen'       => $req->pajak_pph_persen,
                    'effective_from'         => now(),
                    'set_by'                 => $user->Email,
                ]
            );

            // Tambah stok tersedia di region (atomik, terpisah dari updateOrCreate)
            ProductRegionPrice::where('product_id', $req->product_id)
                ->where('region', $req->region)
                ->increment('qty_available', $req->qty_requested);

            $updatedQty = ProductRegionPrice::where('product_id', $req->product_id)
                ->where('region', $req->region)
                ->value('qty_available');

            // Sync ke backend .NET (opsional, untuk Flutter app)
            $dotnetUrl = config('services.dotnet_api.url', 'http://localhost:5000');
            Http::timeout(5)->post("{$dotnetUrl}/admin/product-region-prices", [
                'productId'            => $req->product_id,
                'productName'          => $req->product_name,
                'productCode'          => $req->product_code,
                'region'               => $req->region,
                'hargaSatuan'          => (float) $req->harga_satuan,
                'biayaPengirimanPerKg' => (float) $req->biaya_pengiriman_per_kg,
                'pajakPphPersen'       => (float) $req->pajak_pph_persen,
                'qtyAvailable'         => (float) $updatedQty,
                'setBy'                => $user->Email,
            ]);
        });

        return response()->json([
            'message' => "Ajuan disetujui. Stok region {$req->region} bertambah {$req->qty_requested} TON dan harga diperbarui.",
        ]);
    }

    /**
     * SuperAdmin menolak ajuan — stok dan harga region tidak berubah.
     */
    public function reject(Request $request, string $id)
    {
        $user = Auth::user();
        abort_unless($user->Role === 'SuperAdmin', 403, 'Hanya SuperAdmin yang dapat menolak.');

        $req = ProductStockRequest::findOrFail($id);
        abort_if($req->status !== 'submitted', 422, 'Ajuan ini sudah diproses sebelumnya.');

        $req->update([
            'status'      => 'rejected',
            'reviewed_by' => $user->Email,
            'reviewed_at' => now(),
            'review_note' => $request->input('review_note'),
        ]);

        return response()->json(['message' => 'Ajuan ditolak.']);
    }
}
