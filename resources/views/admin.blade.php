<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Gcommers') }} — Admin Console</title>
        <meta name="theme-color" content="#08111f">
        <link rel="icon" type="image/png" href="/logo.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    </head>
    <body>
        @php
            $u = auth()->user();
            $userData = [
                'id'             => $u->Id,
                'email'          => $u->Email,
                'displayName'    => $u->DisplayName,
                'role'           => $u->Role,
                'region'         => $u->Region,
                'companyName'    => $u->CompanyName,
                'transportirName'=> $u->TransportirName,
                'policeNumber'   => $u->PoliceNumber,
                'picName'        => $u->PicName,
            ];
        @endphp
        <div id="app" data-user="{{ json_encode($userData) }}"></div>
    </body>
</html>
