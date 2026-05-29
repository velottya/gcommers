<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $role = $request->route('role');
        $roleMap = [
            'super-admin' => 'SuperAdmin',
            'admin-region' => 'AdminRegion',
            'admin-transport' => 'AdminTransport',
        ];

        if ($role !== null && ! array_key_exists($role, $roleMap)) {
            abort(404);
        }

        $request->attributes->set('adminRole', $role !== null ? $roleMap[$role] : null);

        return $next($request);
    }
}
