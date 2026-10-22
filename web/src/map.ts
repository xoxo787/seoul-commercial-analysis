import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { hasCoordinates, verdictPresentation } from './lib/data';
import type { Station } from './lib/types';

export function createStationMap(stations: Station[], onSelect: (station: Station) => void) {
  const map = L.map('station-map', { scrollWheelZoom: false, zoomControl: false }).setView([37.5665, 126.978], 11);
  L.control.zoom({ position: 'topright', zoomInTitle: '지도 확대', zoomOutTitle: '지도 축소' }).addTo(map);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
  tiles.on('tileerror', () => {
    const status = document.querySelector('#map-status');
    if (status) status.textContent = '배경 지도를 불러오지 못했습니다. 역 마커와 검색 목록은 계속 사용할 수 있습니다.';
  });
  const markers = new Map<string, L.Marker>();
  const coordinates = stations.filter(hasCoordinates);
  let selectedMarker: L.Marker | undefined;
  for (const station of coordinates) {
    const marker = L.marker([station.lat, station.lng], {
      icon: L.divIcon({
        className: `station-marker ${verdictPresentation(station.verdict).className}`,
        html: '<span class="marker-dot" aria-hidden="true"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      title: `${station.name} · ${station.verdict} · 상세 보기`,
      alt: `${station.name} 역 상세 보기`,
      keyboard: true,
      riseOnHover: true,
    }).addTo(map);
    const tooltip = document.createElement('span');
    tooltip.textContent = `${station.name} · ${station.verdict}`;
    marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -10] });
    marker.on('click', () => onSelect(station));
    const element = marker.getElement();
    element?.setAttribute('aria-label', `${station.name} 역 상세 보기`);
    markers.set(station.id, marker);
  }
  if (coordinates.length) map.fitBounds(coordinates.map((station) => [station.lat, station.lng]), { padding: [26, 26], maxZoom: 12 });
  return {
    select(station: Station, pan: boolean) {
      selectedMarker?.getElement()?.classList.remove('is-selected');
      selectedMarker?.setZIndexOffset(0);
      selectedMarker = markers.get(station.id);
      if (selectedMarker) {
        selectedMarker.getElement()?.classList.add('is-selected');
        selectedMarker.setZIndexOffset(1000);
        if (pan) map.panTo(selectedMarker.getLatLng(), { animate: false });
      }
    },
  };
}
