import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  GoogleMap,
  InfoWindow,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";
import mapStyles from "../../src/mapStyles";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";
import "@reach/combobox/styles.css";
import { createChallenge } from "../store";

const libraries = ["places"];
const mapCenter = { lat: 40.7616731, lng: -73.8155219 };
const mapContainerStyle = { width: "90vw", height: "90vh" };
const options = {
  styles: mapStyles,
  disableDefaultUI: true,
  zoomControl: true,
};

function Explore({ challenges, auth, createChallenge }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [searchMap, setSearchMap] = useState(null);
  const [search, setSearch] = useState("");
  const [center, setCenter] = useState(mapCenter);

  useEffect(async () => {
    if (searchMap) {
      for (const challengeLine of challenges) {
        const challenge = challengeLine.challenge;

        const place = await getGeocode({
          address: `${challenge.streetAddress}, ${challenge.city}, ${challenge.state} ${challenge.zip}`,
        });
        if (!place) return;

        const { lat, lng } = getLatLng(place[0]);

        let marker = {
          lat,
          lng,
          challenge,
          completed: challengeLine.completed,
          time: new Date(),
        };

        if (
          !markers.find(
            (flag) => flag.lat === marker.lat && flag.lng === marker.lng
          )
        ) {
          setMarkers((current) => {
            return [...current, marker];
          });
        }
      }
    }
  }, [searchMap, challenges.length]);

  useEffect(() => {
    if (search) {
      const request = {
        location: new google.maps.LatLng(center.lat, center.lng),
        radius: "50000",
        type: [`${search}`],
      };
      const map = searchMap;
      const service = new google.maps.places.PlacesService(map);
      if (service) {
        service.nearbySearch(request, callback);
      }

      function callback(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          for (let i = 0; i < results.length; i++) {
            const lat = results[i].geometry.location.lat();
            const lng = results[i].geometry.location.lng();

            let marker = {
              lat,
              lng,
              search,
              result: results[i],
              time: new Date(),
            };

            if (
              !markers.find(
                (flag) => flag.lat === marker.lat && flag.lng === marker.lng
              )
            ) {
              setMarkers((current) => {
                return [...current, marker];
              });
            }
          }
        }
      }
    }
  }, [search, selected]);

  const onMapClick = React.useCallback(async (event) => {
    let address;

    async function getReverseGeocodingData(lat, lng) {
      const latlng = new google.maps.LatLng(lat, lng);
      const geocoder = new google.maps.Geocoder();
      await geocoder.geocode({ latLng: latlng }, (results, status) => {
        if (status !== google.maps.GeocoderStatus.OK) {
          alert(status);
        }
        if (status == google.maps.GeocoderStatus.OK) {
          address = results[0].formatted_address;
        }
      });
    }
    await getReverseGeocodingData(event.latLng.lat(), event.latLng.lng());

    let marker = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
      address,
      time: new Date(),
    };
    setName("");
    setStartDate("");
    setEndDate("");
    setDifficulty("");
    setSelected(marker);
  }, []);

  const mapRef = useRef();

  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
    setSearchMap(map);
  }, []);

  const formSubmit = (ev) => {
    ev.preventDefault();

    const { address } = selected;
    let streetAddress, city, state;
    if (address) {
      const challengeAddress = address.split(", ");
      streetAddress = challengeAddress[0];
      city = challengeAddress[1];
      state = challengeAddress[2].slice(0, 2);
    } else {
      streetAddress = selected.result.vicinity.split(", ")[0];
      city = selected.result.vicinity.split(", ")[1];
      state = selected.result.plus_code.compound_code.split(", ")[1];
    }

    createChallenge({
      name,
      startDate,
      endDate,
      difficulty,
      points: difficulty === "easy" ? 10 : difficulty === "medium" ? 20 : 30,
      streetAddress,
      city,
      state,
    });

    setMarkers((current) => [...current, selected]);
    setSelected("");
  };

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "loading maps";

  return (
    <div className="explore">
      <div className="content flex-container">
        <div className="column-left">
          <h1>Explore Map:</h1>
          <p>Find and create challenges near you.</p>
          <div className="fields">
            <select
              name="search"
              value={search}
              onChange={(ev) => {
                setSearch(ev.target.value);
                setMarkers(markers.filter((markers) => !markers.search));
                setSelected("");
              }}
            >
              <option value="">Show Locations by Type</option>
              <option value="park"> Parks</option>
              <option value="museum"> Museums</option>
              <option value="movie_theater"> Movie Theaters</option>
              <option value="tourist_attraction"> Tourist attractions</option>
              <option value="night_club"> Night Clubs</option>
              <option value="library"> Libraries</option>
              <option value="restaurant"> Restaurants</option>
            </select>
            <Search
              setMarkers={setMarkers}
              setSelected={setSelected}
              auth={auth}
            />
          </div>
        </div>

        <div className="column-right">
          <GoogleMap
            zoom={12}
            mapContainerStyle={mapContainerStyle}
            center={center}
            options={options}
            onClick={onMapClick}
            onLoad={onMapLoad}
            className={"GoogleMap"}
          >
            {markers.map((marker, idx) =>
              marker.search ? (
                <Marker
                  key={idx}
                  icon={{
                    url: `${marker.result.icon}`,
                    scaledSize: new google.maps.Size(20, 20),
                  }}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  onClick={() => {
                    setSelected(marker);
                  }}
                />
              ) : marker.completed ? (
                <Marker
                  key={idx}
                  icon={{
                    url: "https://loc8tor.co.uk/wp-content/uploads/2015/08/stencil.png",
                    scaledSize: new google.maps.Size(100, 50),
                  }}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  onClick={() => {
                    setSelected(marker);
                  }}
                />
              ) : (
                <Marker
                  key={idx}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  onClick={() => {
                    setSelected(marker);
                  }}
                />
              )
            )}

            {selected && <Marker position={selected} />}

            {selected ? (
              <InfoWindow
                position={selected}
                onCloseClick={() => {
                  setSelected(null);
                  setName("");
                  setStartDate("");
                  setEndDate("");
                  setDifficulty("");
                }}
              >
                {selected.search ? (
                  <div>
                    <img
                      src={`${selected.result.icon}`}
                      style={{ width: "20px", height: "20px" }}
                    />
                    <h3>{selected.result.name}</h3>
                    <h3>{selected.result.vicinity}</h3>

                    <form
                      style={{ display: "flex", flexDirection: "column" }}
                      onSubmit={formSubmit}
                    >
                      <input
                        name="name"
                        value={name}
                        onChange={(ev) => setName(ev.target.value)}
                        placeholder="Challenge Name"
                      />
                      <input
                        name="startDate"
                        value={startDate}
                        type="date"
                        onChange={(ev) => setStartDate(ev.target.value)}
                      />
                      <input
                        name="endDate"
                        value={endDate}
                        type="date"
                        onChange={(ev) => setEndDate(ev.target.value)}
                      ></input>
                      <select
                        name="difficulty"
                        value={difficulty}
                        onChange={(ev) => setDifficulty(ev.target.value)}
                      >
                        <option value="">Difficulty</option>
                        <option value={"Easy"}>Easy</option>
                        <option value={"Medium"}>Medium</option>
                        <option value={"Hard"}>Hard</option>
                      </select>
                      <button
                        disabled={
                          !name || !startDate || !endDate || !difficulty
                        }
                      >
                        Create Challenge
                      </button>
                    </form>
                  </div>
                ) : selected.challenge ? (
                  <div>
                    <h2>{selected.challenge.name}</h2>
                    <p>{selected.challenge.difficulty} Difficulty</p>
                    <p>
                      Status: {selected.completed ? "Completed" : "Ongoing"}
                    </p>
                    <p>Start: {selected.challenge.startDate.slice(0, 10)}</p>
                    <p>End: {selected.challenge.endDate.slice(0, 10)}</p>
                  </div>
                ) : (
                  <div className="create-box">
                    <h2>Create a Challenge</h2>
                    <h3>{selected.address}</h3>
                    <button
                      onClick={() => {
                        setCenter({ lat: selected.lat, lng: selected.lng });
                        setMarkers(
                          markers.filter((markers) => !markers.search)
                        );
                        setSelected("");
                      }}
                    >
                      Set as Map Center
                    </button>
                    <form
                      style={{ display: "flex", flexDirection: "column" }}
                      onSubmit={formSubmit}
                    >
                      <input
                        name="name"
                        value={name}
                        onChange={(ev) => setName(ev.target.value)}
                        placeholder="Challenge Name"
                      />
                      <input
                        name="startDate"
                        value={startDate}
                        type="date"
                        onChange={(ev) => setStartDate(ev.target.value)}
                      />
                      <input
                        name="endDate"
                        value={endDate}
                        type="date"
                        onChange={(ev) => setEndDate(ev.target.value)}
                      ></input>
                      <select
                        name="difficulty"
                        value={difficulty}
                        onChange={(ev) => setDifficulty(ev.target.value)}
                      >
                        <option value="">Difficulty</option>
                        <option value={"Easy"}>Easy</option>
                        <option value={"Medium"}>Medium</option>
                        <option value={"Hard"}>Hard</option>
                      </select>
                      <button
                        disabled={
                          !name || !startDate || !endDate || !difficulty
                        }
                      >
                        Create Challenge
                      </button>
                    </form>
                  </div>
                )}
              </InfoWindow>
            ) : null}
          </GoogleMap>
        </div>
      </div>
    </div>
  );
}

const Search = ({ setMarkers, setSelected, auth }) => {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete();

  const handleSelect = async (address) => {
    setValue(address, false);
    clearSuggestions();

    const results = await getGeocode({ address });
    const { lat, lng } = getLatLng(results[0]);

    let marker = {
      lat,
      lng,
      time: new Date(),
      address,
    };

    setSelected(marker);
    setMarkers((current) => [...current, marker]);
  };

  return (
    <div className="search">
      <Combobox onSelect={handleSelect}>
        <ComboboxInput
          className="search-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={!ready}
          placeholder="Enter an address"
        />
        <ComboboxPopover>
          <ComboboxList>
            {status === "OK" &&
              data.map(({ place_id, description }) => (
                <ComboboxOption key={place_id} value={description} />
              ))}
          </ComboboxList>
        </ComboboxPopover>
      </Combobox>
    </div>
  );
};

const mapState = ({ challengeLines, auth }) => {
  const challenges = challengeLines.filter(
    (challengeLine) => challengeLine.userId === auth.id
  );

  return {
    challenges,
    auth,
  };
};

const mapDispatch = (dispatch) => {
  return {
    createChallenge: (newChallenge) => dispatch(createChallenge(newChallenge)),
  };
};

export default connect(mapState, mapDispatch)(Explore);
