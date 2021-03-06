import AsyncStorage from '@react-native-community/async-storage';
import ApiTokenError from '../errors/apiTokenError';
import ApiNoDataError from '../errors/apiNoDataError';
import { API_URL, API_PREFIX } from '../../../helpers/constants/global';
import { parseResponseMessage, checkApiTokenIsValid } from '../errors/helpers/parseMessage';

const CONTENTTYPE_URL = `${API_PREFIX}internal/contenttype`;
const CONTENT_URL = `${API_PREFIX}content`;
const MEDIA_URL = '/media';
const DEFAULT_CT = 'application/json';

export const getApiConfig = async () => {
    /* try catch for fetching api key ? */
    const apiToken = await AsyncStorage.getItem('flotiqApiKey');
    const apiUrl = await AsyncStorage.getItem('flotiqApiUrl') || API_URL;
    if (!apiToken) {
        throw new Error('Missing API Token!');
    }
    return { apiToken, apiUrl };
};

export const fetchContentTypes = async (name) => {
    const url = `${CONTENTTYPE_URL}?limit=200`;
    const response = await fetchData(url);

    if (!response || !response.data || !response.data.length > 0) {
        throw new ApiNoDataError('Missing data!');
    }
    return response.data;
};

export const fetchContentTypeObjects = async (ctoName, pageNr = 1) => {
    const url = `${CONTENT_URL}/${ctoName}?page=${pageNr}`;

    const response = await fetchData(url);
    if (!response || !response.data) {
        throw new ApiNoDataError(`Missing data for ${ctoName}!`);
    }
    const nextPageCoursor = response.total_pages >= pageNr + 1 ? pageNr + 1 : false;

    return { data: response.data, nextPage: nextPageCoursor, totalPages: response.total_pages };
};

export const fetchContentObject = async (ctoName, coId) => {
    const url = `${CONTENT_URL}/${ctoName}/${coId}?hydrate=1`;

    const response = await fetchData(url);
    if (!response) {
        throw new ApiNoDataError(`Missing data for ${coId}!`);
    }
    return response;
};

/* TODO: #2 filters */
export const fetchSearchResults = async (name, search, contentTypeName, filters = []) => {
    const encodedFilters = encodeURIComponent(`{"*":{"type":"contains","filter":"${search.trim()}"}}`);
    const url = `${CONTENT_URL}/${contentTypeName}?filters=${encodedFilters}&limit=100`;
    const response = await fetchData(url);

    if (!response || !response.data || !response.data.length > 0) {
        return [];
    }
    return response.data;
};

const fetchData = async (url) => {
    const { apiToken, apiUrl } = await getApiConfig();
    const requestUrl = apiUrl + url;

    let response = null;
    try {
        response = await fetch(requestUrl, {
            headers: {
                'X-AUTH-TOKEN': apiToken,
            },
        });
    } catch (error) {
        throw new Error(error.message);
    }
    const respData = await response.json();

    const noResponse = !response.status || response.status >= 400;
    if (noResponse || !respData) {
        const errorMess = parseResponseMessage(respData);
        const isApiTokenValid = checkApiTokenIsValid(errorMess);

        if (!isApiTokenValid) {
            throw new ApiTokenError('Invalid API token!');
        }
        if (response.status === 404) {
            return null;
        }
        throw new Error(errorMess);
    }
    return respData;
};

/* operate with object */
export const createContentObject = async (ctoName, body) => {
    if (!ctoName || !body || body.length < 1) {
        throw new Error('Missing data!');
    }
    const url = `${CONTENT_URL}/${ctoName}`;
    const requestBody = body ? JSON.stringify(body) : '';

    const response = await makeApiCall(url, 'POST', requestBody);
    if (!response) {
        throw new ApiNoDataError(`Missing data for ${body.id}!`);
    }
    return response;
};

export const updateContentObject = async (ctoName, coId, body) => {
    const url = `${CONTENT_URL}/${ctoName}/${coId}`;
    const requestBody = body ? JSON.stringify(body) : '';

    const response = await makeApiCall(url, 'PUT', requestBody);
    if (!response) {
        throw new ApiNoDataError(`Missing data for ${coId}!`);
    }
    return response;
};

export const removeContentObject = async (ctoName, coId) => {
    const url = `${CONTENT_URL}/${ctoName}/${coId}`;

    const response = await makeApiCall(url, 'DELETE');
    if (!response) {
        throw new ApiNoDataError(`Missing data for ${coId}!`);
    }
    return response;
};

export const uploadMedia = async (body) => {
    const url = MEDIA_URL;
    const ctHeader = 'multipart/form-data';
    const requestBody = body ? body.data : '';

    const response = await makeApiCall(url, 'POST', requestBody, ctHeader);
    if (!response) {
        throw new ApiNoDataError('Error when uploading!');
    }
    return response;
};

export const makeApiCall = async (url, actionMethod, requestBody, header = '') => {
    const { apiToken, apiUrl } = await getApiConfig();
    const requestUrl = apiUrl + url;

    try {
        const response = await fetch(requestUrl, {
            method: actionMethod,
            headers: {
                'X-AUTH-TOKEN': apiToken,
                'Content-Type': header || DEFAULT_CT,
            },
            body: requestBody,
        });

        if (response.status && response.status < 400) {
            return true;
        }
        const respData = await response.json();
        const errorMess = parseResponseMessage(respData);
        const isApiTokenValid = checkApiTokenIsValid(errorMess);

        if (!isApiTokenValid) {
            throw new ApiTokenError('Invalid API token!');
        }
        throw new Error(errorMess);
    } catch (error) {
        throw new Error(error.message);
    }
};
