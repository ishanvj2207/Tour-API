/* eslint-disable */

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiaXNoYW52aiIsImEiOiJjazJnbjlleGMwMHdkM2pvMHMyaTZ3cnY5In0.94RG5TlegDMwpIKEShlrjQ';

  var map = new mapboxgl.Map({
    container: 'map', // define id to be replaced here
    style: 'mapbox://styles/ishanvj/ck2gnrxtp0noy1cpfwo6kai1f',
    scrollZoom: false
    // center: [-118.113491, 34.111745],
    // zoom: 4
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create Marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add PopUp
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description} </p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
