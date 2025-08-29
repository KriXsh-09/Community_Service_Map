import os
import time
import requests
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.conf import settings
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
import json
from .models import SearchQuery
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages



GOOGLE_API_KEY = settings.GOOGLE_MAPS_API_KEY

def home(request):
    return render(request, 'services/index.html', {
        'api_key': GOOGLE_API_KEY
    })

def register(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Account created! You can now log in.")
            return redirect("login")
    else:
        form = UserCreationForm()
    return render(request, "services/register.html", {"form": form})


@require_GET
def places(request):
    lat = requests.GET.get('lat')
    lng = request.GET.get('lng')
    place_type = request.GET.get('type')
    keyword = request.GET.get('keyword')
    radius = request.GET.get('radius', '5000')
    pagetoken = request.GET.get('pagetoken')
    if not lat or not lng:
        return JsonResponse({'error': 'lat and lng are required'}, status=400)
    
    TYPE_KEYWORD_MAP = {
        'hospital': {'type': 'hospital'},
        'police': {'type': 'police'},
        'fire_station': {'type': 'fire_station'},
        'school': {'type': 'school'},
        'library': {'type': 'library'},
        'shelter': {'keyword': 'shelter'}, # Places has no explicit 'shelter'       type
        'pharmacy': {'type': 'pharmacy'},
    }
    if place_type in TYPE_KEYWORD_MAP:
        mapped = TYPE_KEYWORD_MAP[place_type]
        place_type = mapped.get('type', place_type)
        keyword = keyword or mapped.get('keyword')

    url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
    params = {
        'location': f'{lat},{lng}',
        'radius': radius,
        'key': GOOGLE_API_KEY,
    }

    if pagetoken:
        params['pagetoken'] = pagetoken
    else:
        if place_type:
            params['type'] = place_type
        if keyword:
            params['keyword'] = keyword

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        return JsonResponse({'error': 'request_failed', 'details': str(e)}, status=500)
    
    normalized = []
    for p in data.get('results', []):
        loc = p.get('geometry', {}).get('location', {})
        normalized.append({
            'place_id': p.get('place_id'),
            'name': p.get('name'),
            'vicinity': p.get('vicinity') or p.get('formatted_address'),
            'lat': loc.get('lat'),
            'lng': loc.get('lng'),
            'rating': p.get('rating'),
            'user_ratings_total': p.get('user_ratings_total'),
            'types': p.get('types', []),
        })
    return JsonResponse({
        'status': data.get('status'),
        'results': normalized,
        'next_page_token': data.get('next_page_token'),
    })

@csrf_exempt
def save_search(request):
    if request.method == "POST":
        data = json.loads(request.body.decode("utf-8"))
        query = data.get("query")
        place_type = data.get("place_type")
        lat = data.get("lat")
        lng = data.get("lng")

        search = SearchQuery.objects.create(
            query=query,
            place_type=place_type,
            latitude=lat,
            longitude=lng
        )

        return JsonResponse({"status": "success", "id": search.id})
    return JsonResponse({"status": "error", "message": "Invalid request"}, status=400)


