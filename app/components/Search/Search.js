import React, { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { Overlay, SearchBar } from 'react-native-elements';
import { Picker } from '@react-native-community/picker';
import { useRoute } from '@react-navigation/native';

import { useQuery, queryCache } from 'react-query';
import { getFilterArrayByKeyName } from '../../helpers/contentTypesHelper';
import CustomBtn from '../CustomBtn/CustomBtn';
import * as httpQ from '../../api/http/rquests/contentTypes';

import styles from './styles';

const Search = (props) => {
    const [search, setSearch] = useState('');
    const [startSearch, setStartSearch] = useState(false);
    const [chosenCT, setChosenCT] = useState(props.preChosenCT || '');

    const route = useRoute();
    const { contentTypes, partOfTitlePropsList, withRichTextPropsList } = route.params;

    const { status, data, refetch, isFetching } = useQuery(['search', search, chosenCT], httpQ.fetchSearchResults, {
        manual: true,
    });

    useEffect(() => {
        if (!chosenCT && contentTypes[0] && contentTypes[0].name) {
            setChosenCT(contentTypes[0].name);
        }
    }, [chosenCT, contentTypes]);

    useEffect(() => {
        const canRefetch = status !== 'loading' && !isFetching && startSearch && search.length > 3;
        if (canRefetch) {
            refetch();
        }
    }, [chosenCT, status, isFetching, refetch, startSearch, search]);

    const toggleOverlay = () => {
        props.onPress(search);
    };

    const showSearchResults = () => {
        toggleOverlay();
        props.navigation.navigate({
            name: 'SearchResultsObjectsScreen',
            params: {
                searchResults: data,
                contentTypeName: chosenCT,
                partOfTitleProps: getFilterArrayByKeyName(partOfTitlePropsList, chosenCT),
                withRichTextProps: getFilterArrayByKeyName(withRichTextPropsList, chosenCT),
            },
        });
    };

    const updateSearch = (s) => {
        const charsLimit = 50;
        const sWithMaxChars = s && s.substring(0, charsLimit);
        const limitReached = s.length > 50;
        const searchChanged = search && search.trim().length > 2;
        const searchLength = search && search.trim().length;
        const sChanged = sWithMaxChars && sWithMaxChars.trim().length > 3;
        const sLength = sWithMaxChars && sWithMaxChars.trim().length;
        const diffChanged = Math.abs(sLength - searchLength) > 0;

        const canStartSearch = searchChanged && sChanged && diffChanged && status !== 'loading' && !limitReached;
        if (canStartSearch) {
            setStartSearch(true);
        } else if (!isFetching && startSearch) {
            setStartSearch(false);
        }
        if (!limitReached)setSearch(sWithMaxChars);
    };

    const onKeyPressHandler = () => {
        if (startSearch) refetch();
    };

    const getContentTypesNames = () => {
        if (!contentTypes) return null;
        const ctd = contentTypes.map((ct) => (
            <Picker.Item
                key={`${ct.id}-picker-item`}
                label={ct.label || ''}
                value={ct.name || ''}
            />
        ));
        return ctd;
    };

    const renderLengthLimit = () => (
        <View style={styles.searchLimitBox}>
            <Text style={styles.searchLimitText}>
                {(search.length >= 50) && (<>Max 50 characters allowed.</>)}
            </Text>
        </View>
    );

    const lastData = () => data || queryCache.getQuery('search');

    return (
        <>
            <View>
                <Overlay
                    isVisible={route.params.searchBoxVisible}
                    onBackdropPress={toggleOverlay}
                    overlayStyle={styles.overlay}
                >
                    <View>
                        {contentTypes
                            && (
                                <View style={Platform.OS === 'ios'
                                    ? styles.searchBarPickerContainerIOS
                                    : styles.searchBarPickerContainerAndroid}
                                >
                                    <Picker
                                        selectedValue={chosenCT}
                                        style={styles.searchBarPicker}
                                        onValueChange={(itemValue) => {
                                            setChosenCT(itemValue);
                                            setStartSearch(true);
                                        }}
                                    >
                                        {getContentTypesNames()}
                                    </Picker>
                                </View>
                            )}
                        <SearchBar
                            placeholder="Type Here (min 4 chars) ..."
                            onChangeText={(text) => updateSearch(text)}
                            value={search}
                            inputContainerStyle={styles.searchBarInputContainer}
                            containerStyle={styles.searchBarContainer}
                            inputStyle={styles.searchBarInput}
                            searchIcon={null}
                            clearIcon={{ iconStyle: [styles.searchBarInputClearIcon] }}
                            placeholderTextColor="#989898"
                            showLoading={isFetching}
                            loadingProps={{ style: [styles.searchBarInputLoader] }}
                            onKeyPress={onKeyPressHandler}
                        />
                        <View style={styles.searchResultContainer}>
                            <Text style={styles.searchResultText}>
                                {lastData() && (
                                    <>
                                        found
                                        {' '}
                                        <Text style={styles.searchResultTextValue}>
                                            {lastData().length || 0}
                                        </Text>
                                        {' '}
                                        results
                                    </>
                                )}
                            </Text>
                        </View>
                        {renderLengthLimit()}
                        <CustomBtn
                            title="Show Results"
                            onPressBtn={showSearchResults}
                            buttonStyle={styles.searchButton}
                            disabled={!data || !data.length > 0 || isFetching}
                            loading={isFetching}
                        />
                    </View>
                </Overlay>
            </View>
        </>
    );
};

export default Search;
