import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('searchForm');
  const [searchData, setSearchData] = useState({
    searchEngineId: 1, // Default to Google (based on your seeded data)
    targetUrl: '',
    keyword: '',
    topNResult: 100 // Default as per your model
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [expandedSearchId, setExpandedSearchId] = useState(null);
  const [searchResults, setSearchResults] = useState({});
  const [currentSearchResults, setCurrentSearchResults] = useState(null);

  // Fetch search history when the component mounts and when the active tab changes
  useEffect(() => {
    if (activeTab === 'searchHistory') {
      fetchSearchHistory();
    }
  }, [activeTab]);

  const fetchSearchHistory = async () => {
    try {
      const response = await fetch('https://localhost:7282/search/history');
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data);
      } else {
        console.error('Failed to fetch search history');
      }
    } catch (error) {
      console.error('Error fetching search history:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchData({
      ...searchData,
      [name]: name === 'topNResult' || name === 'searchEngineId' ? parseInt(value) : value
    });
  };

  const handleSubmit = async (e) => {    
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setCurrentSearchResults(null);

    try {
      const response = await fetch('https://localhost:7282/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData)
      });

      // First check if the response is ok
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = response.statusText;
        try {
          // Try to parse the response as JSON
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.title || errorJson.detail || errorMessage;
        } catch (parseError) {
          // If we can't parse as JSON, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }

      // Now safely parse the JSON response
      let responseText = await response.text();
      let result;
      
      // Handle empty response
      if (!responseText || responseText.trim() === '') {
        setMessage('Search added successfully, but no result data was returned.');
      } else {
        try {
          result = JSON.parse(responseText);
          setMessage(result.message || 'Search added successfully!');
          
          // Store the search results for immediate display
          if (result.results) {
            setCurrentSearchResults(result.results);
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          setMessage('Search may have been added, but the response could not be processed.');
        }
      }
      
      // Clear form
      setSearchData({
        searchEngineId: 1,
        targetUrl: '',
        keyword: '',
        topNResult: 100
      });
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSearchDetails = async (searchId) => {
    if (expandedSearchId === searchId) {
      setExpandedSearchId(null);
      return;
    }

    setExpandedSearchId(searchId);

    // If we don't already have the results for this search, fetch them
    if (!searchResults[searchId]) {
      try {
        const response = await fetch(`https://localhost:7282/search/results/${searchId}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(prev => ({
            ...prev,
            [searchId]: data
          }));
        } else {
          console.error(`Failed to fetch results for search ID ${searchId}`);
        }
      } catch (error) {
        console.error(`Error fetching results for search ID ${searchId}:`, error);
      }
    }
  };

  // Format the date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Search Analytics</h1>
        <nav className="nav-bar">
          <button 
            className={activeTab === 'searchForm' ? 'active' : ''} 
            onClick={() => setActiveTab('searchForm')}
          >
            Add Search
          </button>
          <button 
            className={activeTab === 'searchHistory' ? 'active' : ''} 
            onClick={() => setActiveTab('searchHistory')}
          >
            Search History
          </button>
        </nav>
      </header>
      
      <main>
        {activeTab === 'searchForm' ? (
          <div className="search-form-container">
            <h2>Add New Search</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="targetUrl">Target URL:</label>
                <input
                  type="url"
                  id="targetUrl"
                  name="targetUrl"
                  value={searchData.targetUrl}
                  onChange={handleChange}
                  placeholder="e.g., https://example.com"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="keyword">Search Keyword:</label>
                <input
                  type="text"
                  id="keyword"
                  name="keyword"
                  value={searchData.keyword}
                  onChange={handleChange}
                  placeholder="Enter keyword to search"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="topNResult">Top N Results:</label>
                <input
                  type="number"
                  id="topNResult"
                  name="topNResult"
                  value={searchData.topNResult}
                  onChange={handleChange}
                  min="1"
                  max="1000"
                  required
                />
              </div>
              
              <button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Add Search'}
              </button>
            </form>
            
            {message && <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
              {message}
            </div>}
            
            {currentSearchResults && (
              <div className="search-results-container">
                <h3>Search Results</h3>
                {currentSearchResults.length > 0 ? (
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>URL</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSearchResults.map((result) => (
                        <tr key={result.id} className={result.url.includes(searchData.targetUrl) ? 'matching-result' : ''}>
                          <td>{result.position}</td>
                          <td>
                            <a href={result.url} target="_blank" rel="noopener noreferrer">
                              {result.url}
                            </a>
                          </td>
                          <td>{formatDate(result.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No results found for this search.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="search-history-container">
            <h2>Search History</h2>
            {searchHistory.length === 0 ? (
              <p>No search history available.</p>
            ) : (
              <ul className="search-history-list">
                {searchHistory.map((search) => (
                  <li key={search.id} className="search-history-item">
                    <div 
                      className="search-header" 
                      onClick={() => toggleSearchDetails(search.id)}
                    >
                      <div className="search-info">
                        <strong>Keyword:</strong> {search.keyword}
                      </div>
                      <div className="search-info">
                        <strong>Target URL:</strong> {search.targetUrl}
                      </div>
                      <div className="search-info">
                        <strong>Date:</strong> {formatDate(search.date)}
                      </div>
                      <div className="dropdown-icon">
                        {expandedSearchId === search.id ? '▲' : '▼'}
                      </div>
                    </div>
                    
                    {expandedSearchId === search.id && (
                      <div className="search-results">
                        <h3>Search Results</h3>
                        {searchResults[search.id] ? (
                          searchResults[search.id].length > 0 ? (
                            <table className="results-table">
                              <thead>
                                <tr>
                                  <th>Position</th>
                                  <th>URL</th>
                                  <th>Created At</th>
                                </tr>
                              </thead>
                              <tbody>
                                {searchResults[search.id].map((result) => (
                                  <tr key={result.id} className={result.url.includes(search.targetUrl) ? 'matching-result' : ''}>
                                    <td>{result.position}</td>
                                    <td>
                                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                                        {result.url}
                                      </a>
                                    </td>
                                    <td>{formatDate(result.createdAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p>No results found for this search.</p>
                          )
                        ) : (
                          <p>Loading results...</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
