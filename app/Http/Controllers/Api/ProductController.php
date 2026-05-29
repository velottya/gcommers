<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

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
            $query->where('Status', $request->status);
        }

        $products = $query->orderBy('CreatedAt', 'desc')->paginate(20);

        return response()->json(
            $products->through(fn (Product $p) => $this->format($p))
        );
    }

    public function categories()
    {
        $categories = Product::distinct()->pluck('Category')->filter()->values();

        return response()->json($categories);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

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
}
