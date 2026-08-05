import React, { useState } from "react";
import { searchProperties, rankProperties, formatValue, getPropertyTypeLabel } from "../regrind.js";
import { makeProspect } from "../store.js";
import "../styles/PropertyHunter.css";

const PROPERTY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "investment", label: "Investment" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "commercial", label: "Commercial" },
  { value: "vacant", label: "Vacant Land" },
];

export default function PropertyHunter({ state, setState, regrindToken }) {
  const [searchAddress, setSearchAddress] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(["residential", "investment", "multi_family"]);
  const [radius, setRadius] = useState(2000); // meters
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [limit, setLimit] = useState(50);

  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedProperties, setSelectedProperties] = useState(new Set());
  const [addingToProspects, setAddingToProspects] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchAddress.trim()) {
      setError("Please enter an address or area");
      return;
    }
    if (!regrindToken) {
      setError("Regrind API token not configured. Please add it in Settings.");
      return;
    }

    setSearching(true);
    setError(null);
    setSelectedProperties(new Set());

    try {
      const results = await searchProperties(
        {
          address: searchAddress,
          radius: parseInt(radius),
          propertyTypes: selectedTypes,
          minValue: minValue ? parseInt(minValue) : null,
          maxValue: maxValue ? parseInt(maxValue) : null,
          limit: parseInt(limit),
        },
        regrindToken
      );

      // Rank and deduplicate against existing jobs/prospects
      const ranked = rankProperties(results.properties, {
        jobs: state.jobs || [],
        prospects: state.prospects || [],
        center: results.center,
        limit: parseInt(limit),
      });

      setSearchResults({
        ...results,
        properties: ranked,
      });

      if (ranked.length === 0) {
        setError(
          "No new properties found in this area. All properties may already be in your jobs or prospects."
        );
      }
    } catch (err) {
      setError(err.message || "Search failed. Please try again.");
      console.error("[v0] Property search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const togglePropertySelection = (propertyId) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
  };

  const toggleAllProperties = () => {
    if (selectedProperties.size === searchResults.properties.length) {
      setSelectedProperties(new Set());
    } else {
      setSelectedProperties(
        new Set(searchResults.properties.map((p) => p.id))
      );
    }
  };

  const handleAddSelected = async () => {
    if (selectedProperties.size === 0) {
      setError("Please select properties to add");
      return;
    }

    setAddingToProspects(true);
    setError(null);

    try {
      const propertiesToAdd = searchResults.properties.filter((p) =>
        selectedProperties.has(p.id)
      );

      const newProspects = propertiesToAdd.map((prop) =>
        makeProspect({
          address: prop.address,
          city: prop.city,
          zip: prop.zip,
          owner: prop.owner,
          mailAddress: prop.mailAddress,
          coords: prop.coords,
          value: prop.value,
          source: "regrind",
          name: prop.owner || "Property Lead",
          targetMonthly: prop.value ? Math.round(prop.value / 300) : null, // rough estimate
        })
      );

      // Add all prospects to state
      setState((s) => ({
        ...s,
        prospects: [...(s.prospects || []), ...newProspects],
      }));

      setSelectedProperties(new Set());
      setError(null);
      alert(`Added ${newProspects.length} properties to prospects!`);

      // Clear search to show success
      setTimeout(() => {
        setSearchResults(null);
        setSearchAddress("");
      }, 1000);
    } catch (err) {
      setError("Failed to add properties to prospects. Please try again.");
      console.error("[v0] Add prospects error:", err);
    } finally {
      setAddingToProspects(false);
    }
  };

  return (
    <div className="property-hunter">
      <h1>Property Hunter</h1>
      <p className="subtitle">Find properties to target for new jobs</p>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="form-group">
          <label>Address or Area</label>
          <input
            type="text"
            placeholder="Enter address, city, or ZIP code"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            disabled={searching}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Search Radius (meters)</label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              min="500"
              max="5000"
              step="500"
              disabled={searching}
            />
          </div>

          <div className="form-group">
            <label>Results Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              min="10"
              max="100"
              step="10"
              disabled={searching}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Property Types</label>
          <div className="checkbox-group">
            {PROPERTY_TYPES.map((type) => (
              <label key={type.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTypes([...selectedTypes, type.value]);
                    } else {
                      setSelectedTypes(selectedTypes.filter((t) => t !== type.value));
                    }
                  }}
                  disabled={searching}
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Min Property Value</label>
            <input
              type="number"
              placeholder="Any"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              disabled={searching}
            />
          </div>

          <div className="form-group">
            <label>Max Property Value</label>
            <input
              type="number"
              placeholder="Any"
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
              disabled={searching}
            />
          </div>
        </div>

        <button type="submit" disabled={searching} className="btn-primary">
          {searching ? "Searching..." : "Search Properties"}
        </button>
      </form>

      {/* Error Display */}
      {error && <div className="error-message">{error}</div>}

      {/* Search Results */}
      {searchResults && searchResults.properties.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h2>
              Found {searchResults.properties.length} Properties
              {searchResults.center && (
                <span className="result-distance">
                  near {searchResults.center.lat.toFixed(3)}, {searchResults.center.lng.toFixed(3)}
                </span>
              )}
            </h2>

            <div className="bulk-actions">
              <label className="select-all">
                <input
                  type="checkbox"
                  checked={selectedProperties.size === searchResults.properties.length}
                  onChange={toggleAllProperties}
                />
                Select All ({selectedProperties.size})
              </label>
              {selectedProperties.size > 0 && (
                <button
                  onClick={handleAddSelected}
                  disabled={addingToProspects}
                  className="btn-success"
                >
                  {addingToProspects
                    ? `Adding ${selectedProperties.size}...`
                    : `Add ${selectedProperties.size} to Prospects`}
                </button>
              )}
            </div>
          </div>

          <div className="properties-grid">
            {searchResults.properties.map((property) => (
              <div
                key={property.id}
                className={`property-card ${selectedProperties.has(property.id) ? "selected" : ""}`}
              >
                <div className="property-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedProperties.has(property.id)}
                    onChange={() => togglePropertySelection(property.id)}
                  />
                </div>

                <div className="property-header">
                  <h3>{property.address}</h3>
                  {property.distanceM && (
                    <span className="distance">
                      {(property.distanceM / 1000).toFixed(1)}km away
                    </span>
                  )}
                </div>

                <div className="property-location">
                  {property.city && property.state ? (
                    <p>
                      {property.city}, {property.state} {property.zip}
                    </p>
                  ) : (
                    <p>{property.zip}</p>
                  )}
                </div>

                {/* Basic Info */}
                <div className="property-section">
                  <h4>Property Details</h4>
                  <div className="property-info">
                    {property.propertyType && (
                      <div className="info-item">
                        <span className="label">Type:</span>
                        <span>{getPropertyTypeLabel(property.propertyType)}</span>
                      </div>
                    )}
                    {property.squareFeet && (
                      <div className="info-item">
                        <span className="label">Sq Ft:</span>
                        <span>{property.squareFeet.toLocaleString()}</span>
                      </div>
                    )}
                    {property.lotSize && (
                      <div className="info-item">
                        <span className="label">Lot Size:</span>
                        <span>{property.lotSize.toFixed(1)} acres</span>
                      </div>
                    )}
                    {property.yearBuilt && (
                      <div className="info-item">
                        <span className="label">Built:</span>
                        <span>{property.yearBuilt}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Info */}
                {(property.bedrooms || property.bathrooms) && (
                  <div className="property-section">
                    <h4>Structure</h4>
                    <div className="property-info">
                      {property.bedrooms && (
                        <div className="info-item">
                          <span className="label">Beds:</span>
                          <span>{property.bedrooms}</span>
                        </div>
                      )}
                      {property.bathrooms && (
                        <div className="info-item">
                          <span className="label">Baths:</span>
                          <span>{property.bathrooms}</span>
                        </div>
                      )}
                      {property.garage && (
                        <div className="info-item">
                          <span className="label">Garage:</span>
                          <span>{property.garage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Valuation Info */}
                {(property.value || property.assessedValue) && (
                  <div className="property-section">
                    <h4>Valuation</h4>
                    <div className="property-info">
                      {property.value && (
                        <div className="info-item">
                          <span className="label">Est. Value:</span>
                          <span className="value-highlight">{formatValue(property.value)}</span>
                        </div>
                      )}
                      {property.assessedValue && (
                        <div className="info-item">
                          <span className="label">Assessed:</span>
                          <span>{formatValue(property.assessedValue)}</span>
                        </div>
                      )}
                      {property.lastSalePrice && (
                        <div className="info-item">
                          <span className="label">Last Sale:</span>
                          <span>{formatValue(property.lastSalePrice)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Owner Info */}
                {property.owner && (
                  <div className="property-section">
                    <h4>Owner</h4>
                    <div className="property-info">
                      <div className="info-item">
                        <span className="label">Name:</span>
                        <span>{property.owner}</span>
                      </div>
                      {property.mailAddress && (
                        <div className="info-item">
                          <span className="label">Mail:</span>
                          <span className="mail-address">{property.mailAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Condition & Landscaping */}
                {(property.propertyCondition || property.landscapingType) && (
                  <div className="property-section">
                    <h4>Condition</h4>
                    <div className="property-info">
                      {property.propertyCondition && (
                        <div className="info-item">
                          <span className="label">Property:</span>
                          <span className="condition-badge">{property.propertyCondition}</span>
                        </div>
                      )}
                      {property.landscapingType && (
                        <div className="info-item">
                          <span className="label">Landscaping:</span>
                          <span className="condition-badge">{property.landscapingType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {searchResults && searchResults.properties.length === 0 && !error && (
        <div className="empty-state">
          <p>No properties found. Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  );
}
