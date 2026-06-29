<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KecamatanProductPrice;
use App\Models\KecamatanProductStock;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_produk', 'like', "%{$search}%")
                  ->orWhere('kode_produk', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $this->normalizeStatus($request->status));
        }

        $perPage  = min((int) $request->input('per_page', 20), 500);
        $products = $query->orderBy('kode_produk', 'asc')->paginate($perPage);

        return response()->json(
            $products->through(fn (Product $p) => $this->format($p))
        );
    }

    public function show(string $id)
    {
        return response()->json($this->format(Product::findOrFail($id)));
    }

    // ── Stok & harga terkini per kecamatan (dari tabel current-state) ────────

    public function kecamatanStatus(string $id)
    {
        $product = Product::findOrFail($id);
        $user    = Auth::user();

        $priceQuery = KecamatanProductPrice::where('product_id', $product->id);
        $stockQuery = KecamatanProductStock::where('product_id', $product->id);

        if ($user->Role === 'AdminRegion') {
            $priceQuery->where('region', $user->Region);
            $stockQuery->where('region', $user->Region);
        }

        $prices = $priceQuery->get()->keyBy('kecamatan');
        $stocks = $stockQuery->get()
                              ->groupBy('kecamatan')
                              ->map(fn ($rows) => $rows->sortByDesc('period')->first());

        $kecamatanNames = $prices->keys()->merge($stocks->keys())->unique()->sort()->values();

        $rows = $kecamatanNames->map(function ($kecamatan) use ($prices, $stocks) {
            $price   = $prices->get($kecamatan);
            $stock   = $stocks->get($kecamatan);
            $usedTon = $stock?->usedTon();

            return [
                'kecamatan'         => $kecamatan,
                'region'            => $price->region ?? $stock->region ?? null,
                'harga_satuan'      => $price ? (float) $price->harga_satuan : null,
                'price_updated_at'  => $price->approved_at ?? null,
                'period'            => $stock->period ?? null,
                'quota_ton'         => $stock ? (float) $stock->quota_ton : null,
                'used_ton'          => $usedTon,
                'remaining_ton'     => $stock ? max(0, (float) $stock->quota_ton - $usedTon) : null,
                'stock_updated_at'  => $stock->approved_at ?? null,
            ];
        });

        return response()->json($rows->values());
    }

    public function categories()
    {
        // Mengembalikan daftar jenis produk (saat ini semua "Subsidi")
        $jenis = Product::distinct()->pluck('jenis')->filter()->values();
        return response()->json($jenis);
    }

    public function store(Request $request)
    {
        abort_unless(Auth::user()?->Role === 'SuperAdmin', 403, 'Hanya SuperAdmin yang dapat menambah produk.');

        $validated = $request->validate([
            'kodeProduk' => ['required', 'string', 'max:20', Rule::unique('product_master', 'kode_produk')],
            'namaProduk' => 'required|string|max:100',
            'uraian'     => 'nullable|string',
            'satuan'     => 'required|string|max:20',
            'status'     => ['required', Rule::in(['Aktif', 'Nonaktif'])],
            'jenis'      => 'required|string|max:50',
            'foto'       => 'nullable|string|max:255',
        ]);

        $product = Product::create([
            'kode_produk' => $validated['kodeProduk'],
            'nama_produk' => $validated['namaProduk'],
            'uraian'      => $validated['uraian'] ?? null,
            'satuan'      => $validated['satuan'],
            'status'      => $this->normalizeStatus($validated['status']),
            'jenis'       => $validated['jenis'],
            'foto'        => $validated['foto'] ?? 'nologo.png',
        ]);

        return response()->json($this->format($product), 201);
    }

    public function update(Request $request, string $id)
    {
        abort_unless(
            in_array(Auth::user()?->Role, ['SuperAdmin', 'AdminRegion'], true),
            403,
            'Akses tidak diizinkan.'
        );

        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'namaProduk' => 'sometimes|required|string|max:100',
            'uraian'     => 'nullable|string',
            'satuan'     => 'sometimes|required|string|max:20',
            'status'     => ['sometimes', 'required', Rule::in(['Aktif', 'Nonaktif'])],
            'jenis'      => 'sometimes|required|string|max:50',
            'foto'       => 'nullable|string|max:255',
        ]);

        if (isset($validated['namaProduk']))              $product->nama_produk = $validated['namaProduk'];
        if (array_key_exists('uraian', $validated))       $product->uraian      = $validated['uraian'];
        if (isset($validated['satuan']))                  $product->satuan      = $validated['satuan'];
        if (isset($validated['status']))                  $product->status      = $this->normalizeStatus($validated['status']);
        if (isset($validated['jenis']))                   $product->jenis       = $validated['jenis'];
        if (array_key_exists('foto', $validated))         $product->foto        = $validated['foto'] ?? 'nologo.png';

        $product->save();

        return response()->json($this->format($product));
    }

    public function destroy(string $id)
    {
        abort_unless(Auth::user()?->Role === 'SuperAdmin', 403, 'Hanya SuperAdmin yang dapat menghapus produk.');

        Product::findOrFail($id)->delete();

        return response()->noContent();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function normalizeStatus(string $status): string
    {
        return strtolower(trim($status)) === 'nonaktif' ? 'Nonaktif' : 'Aktif';
    }

    private function format(Product $p): array
    {
        return [
            'id'         => $p->id,
            'kodeProduk' => $p->kode_produk,
            'namaProduk' => $p->nama_produk,
            'uraian'     => $p->uraian,
            'satuan'     => $p->satuan,
            'status'     => $p->status,
            'jenis'      => $p->jenis,
            'foto'       => $p->foto,
            'createdAt'  => $p->created_at,
            'updatedAt'  => $p->updated_at,
        ];
    }
}
