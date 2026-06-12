<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('Name', 'like', "%{$search}%")
                  ->orWhere('ProductCode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('Category', $request->category);
        }

        if ($request->filled('status')) {
            $query->where('Status', $this->normalizeStatus($request->status));
        }

        $products = $query->orderBy('CreatedAt', 'desc')->paginate(20);

        return response()->json(
            $products->through(fn (Product $p) => $this->format($p))
        );
    }

    public function show(string $id)
    {
        $product = Product::findOrFail($id);

        return response()->json($this->detail($product));
    }

    public function categories()
    {
        $categories = Product::distinct()->pluck('Category')->filter()->values();

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $this->ensureSuperAdmin();

        $validated = $request->validate([
            'productCode'   => 'required|string|max:50',
            'name'          => 'required|string|max:255',
            'description'   => 'nullable|string',
            'category'      => 'required|string|max:100',
            'price'         => 'required|numeric|min:0',
            'stock'         => 'required|integer|min:0',
            'minimumOrder'  => 'required|integer|min:1',
            'unit'          => 'required|string|max:50',
            'status'        => ['required', Rule::in(['Aktif', 'Nonaktif', 'active', 'inactive'])],
            'iconName'        => 'nullable|string|max:255',
            'sourceProductId' => 'nullable|integer|min:1',
            'specification'   => 'nullable|string',
        ]);

        $product = new Product();
        $product->ProductCode    = $validated['productCode'];
        $product->Name           = $validated['name'];
        $product->Description    = $validated['description'] ?? '';
        $product->Category       = $validated['category'];
        $product->Price          = $validated['price'];
        $product->Stock          = $validated['stock'];
        $product->MinimumOrder   = $validated['minimumOrder'];
        $product->Unit           = $validated['unit'];
        $product->Status         = $this->normalizeStatus($validated['status']);
        $product->IconName       = $validated['iconName'] ?? '';
        $product->SourceProductId = $validated['sourceProductId'] ?? null;
        $product->Specification  = $validated['specification'] ?? null;
        $product->Rating         = 0;
        $product->CreatedAt      = now();
        $product->UpdatedAt      = now();
        $product->save();

        return response()->json($this->detail($product), 201);
    }

    public function update(Request $request, string $id)
    {
        $this->ensureSuperAdmin();

        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'productCode'   => 'sometimes|required|string|max:50',
            'name'          => 'sometimes|required|string|max:255',
            'description'   => 'nullable|string',
            'category'      => 'sometimes|required|string|max:100',
            'price'         => 'sometimes|required|numeric|min:0',
            'stock'         => 'sometimes|required|integer|min:0',
            'minimumOrder'  => 'sometimes|required|integer|min:1',
            'unit'          => 'sometimes|required|string|max:50',
            'status'        => ['sometimes', 'required', Rule::in(['Aktif', 'Nonaktif', 'active', 'inactive'])],
            'iconName'        => 'nullable|string|max:255',
            'sourceProductId' => 'nullable|integer|min:1',
            'specification'   => 'nullable|string',
        ]);

        $map = [
            'productCode'    => 'ProductCode',
            'name'           => 'Name',
            'description'    => 'Description',
            'category'       => 'Category',
            'price'          => 'Price',
            'stock'          => 'Stock',
            'minimumOrder'   => 'MinimumOrder',
            'unit'           => 'Unit',
            'status'         => 'Status',
            'iconName'       => 'IconName',
            'sourceProductId'=> 'SourceProductId',
            'specification'  => 'Specification',
        ];

        foreach ($map as $requestKey => $column) {
            if (array_key_exists($requestKey, $validated)) {
                // Description dan IconName tidak boleh null (NOT NULL di DB)
                if (in_array($column, ['Description', 'IconName'], true)) {
                    $product->$column = $validated[$requestKey] ?? '';
                } else {
                    $product->$column = $validated[$requestKey];
                }
            }
        }

        $product->UpdatedAt = now();
        $product->save();

        return response()->json($this->detail($product));
    }

    public function destroy(string $id)
    {
        $this->ensureSuperAdmin();

        $product = Product::findOrFail($id);
        $product->delete();

        return response()->noContent();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function ensureSuperAdmin(): void
    {
        abort_unless(Auth::user()?->Role === 'SuperAdmin', 403, 'Akses tidak diizinkan.');
    }

    private function normalizeStatus(string $status): string
    {
        return match (strtolower(trim($status))) {
            'inactive', 'nonaktif' => 'Nonaktif',
            default => 'Aktif',
        };
    }

    private function format(Product $p): array
    {
        return [
            'id'            => $p->Id,
            'productCode'   => $p->ProductCode,
            'name'          => $p->Name,
            'description'   => $p->Description,
            'category'      => $p->Category,
            'price'         => $p->Price,
            'stock'         => $p->Stock,
            'minimumOrder'  => $p->MinimumOrder,
            'unit'          => $p->Unit,
            'iconName'      => $p->IconName,
            'sourceProductId' => $p->SourceProductId,
            'status'        => $p->Status,
            'rating'        => $p->Rating,
            'specification' => $p->Specification,
            'createdAt'     => $p->CreatedAt,
            'updatedAt'     => $p->UpdatedAt,
        ];
    }

    private function detail(Product $p): array
    {
        return [
            'id'              => $p->Id,
            'productCode'     => $p->ProductCode,
            'name'            => $p->Name,
            'description'     => $p->Description,
            'category'        => $p->Category,
            'price'           => $p->Price,
            'stock'           => $p->Stock,
            'minimumOrder'    => $p->MinimumOrder,
            'unit'            => $p->Unit,
            'iconName'        => $p->IconName,
            'sourceProductId' => $p->SourceProductId,
            'status'          => $p->Status,
            'rating'          => $p->Rating,
            'specification'   => $p->Specification,
            'createdAt'       => $p->CreatedAt,
            'updatedAt'       => $p->UpdatedAt,
        ];
    }
}
