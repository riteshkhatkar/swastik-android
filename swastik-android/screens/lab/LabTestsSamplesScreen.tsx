// swastik-android/screens/lab/LabTestsSamplesScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { labApi, getApiErrorMessage } from '../../services/api';

interface LabTestsSamplesScreenProps {
  onOpenDrawer: () => void;
  onNavigateToReport: (requestId: string, patientData?: any) => void;
}

export const LabTestsSamplesScreen: React.FC<LabTestsSamplesScreenProps> = ({
  onOpenDrawer,
  onNavigateToReport,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'samples' | 'catalog'>('samples');
  
  // Tab 1 state
  const [samplesSearch, setSamplesSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Enter Results Modal State
  const [selectedReqForResult, setSelectedReqForResult] = useState<any | null>(null);
  const [resultInput, setResultInput] = useState('');
  const [paramInput, setParamInput] = useState('');
  const [unitInput, setUnitInput] = useState('');
  const [refRangeInput, setRefRangeInput] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(false);

  // Tab 2 state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await labApi.getTestRequests(statusFilter === 'All Status' ? undefined : statusFilter);
      if (data && Array.isArray(data)) {
        setRequests(data);
      }
    } catch (err) {
      console.log('Error loading requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const testCatalog = [
    {
      id: 'tc-1',
      name: 'Complete Blood Count (CBC)',
      category: 'Hematology',
      price: 300,
      sampleType: 'Whole Blood (EDTA)',
      turnaround: '6 - 8 hours',
      refRange: 'Varies by parameter',
      iconName: 'water',
    },
    {
      id: 'tc-2',
      name: 'Blood Sugar (Fasting)',
      category: 'Biochemistry',
      price: 80,
      sampleType: 'Serum / Plasma',
      turnaround: '2 - 4 hours',
      refRange: '70 - 100 mg/dL',
      iconName: 'flask',
    },
    {
      id: 'tc-3',
      name: 'Liver Function Test (LFT)',
      category: 'Liver Function',
      price: 600,
      sampleType: 'Serum',
      turnaround: '8 - 12 hours',
      refRange: 'Varies by parameter',
      iconName: 'shield',
    },
    {
      id: 'tc-4',
      name: 'Renal Function Test (RFT)',
      category: 'Kidney Function',
      price: 500,
      sampleType: 'Serum',
      turnaround: '6 - 8 hours',
      refRange: 'Varies by parameter',
      iconName: 'fitness',
    },
    {
      id: 'tc-5',
      name: 'Thyroid Profile (T3, T4, TSH)',
      category: 'Endocrinology',
      price: 450,
      sampleType: 'Serum',
      turnaround: '8 - 12 hours',
      refRange: 'TSH: 0.4 - 4.0 µIU/mL',
      iconName: 'heart',
    },
    {
      id: 'tc-6',
      name: 'Lipid Profile',
      category: 'Lipid Profile',
      price: 400,
      sampleType: 'Serum',
      turnaround: '8 - 12 hours',
      refRange: 'Varies by parameter',
      iconName: 'water',
    },
    {
      id: 'tc-7',
      name: 'Vitamin D & B12 Panel',
      category: 'Biochemistry',
      price: 950,
      sampleType: 'Serum',
      turnaround: '12 - 24 hours',
      refRange: 'Vit D > 30 ng/mL',
      iconName: 'sunny',
    },
  ];

  const filteredRequests = requests.filter((r) => {
    if (!samplesSearch.trim()) return true;
    const q = samplesSearch.toLowerCase();
    return (
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.sampleId && r.sampleId.toLowerCase().includes(q)) ||
      (r.tests && r.tests.toLowerCase().includes(q))
    );
  });

  const filteredCatalog = testCatalog.filter((item) => {
    const matchesCategory =
      categoryFilter === 'All Categories' || item.category === categoryFilter;
    if (!matchesCategory) return false;
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  const handleAction = async (item: any) => {
    const reqId = item.id || item._id;
    try {
      if (item.status === 'REQUESTED') {
        await labApi.acknowledgeRequest(reqId);
        Alert.alert('Acknowledged', `Request ${reqId} has been acknowledged.`);
        setRequests((prev) =>
          prev.map((q) => ((q.id === reqId || q._id === reqId) ? { ...q, status: 'ACKNOWLEDGED' } : q))
        );
      } else if (item.status === 'ACKNOWLEDGED') {
        await labApi.startSampleCollection(reqId);
        Alert.alert('Collection Started', `Sample collection started for ${item.patientName || item.patient_name}.`);
        setRequests((prev) =>
          prev.map((q) => ((q.id === reqId || q._id === reqId) ? { ...q, status: 'SAMPLE COLLECTED' } : q))
        );
      } else if (item.status === 'SAMPLE COLLECTED') {
        await labApi.markTestInProcess(reqId);
        Alert.alert('In Process', `Testing initiated for ${item.patientName || item.patient_name}.`);
        setRequests((prev) =>
          prev.map((q) => ((q.id === reqId || q._id === reqId) ? { ...q, status: 'TEST IN PROCESS' } : q))
        );
      } else if (item.status === 'TEST IN PROCESS' || item.status === 'IN PROCESS') {
        setSelectedReqForResult(item);
        setParamInput(item.tests || item.test_name || 'Observation');
        setResultInput('');
        setUnitInput('');
        setRefRangeInput('Normal');
        setShowResultModal(true);
      } else if (item.status === 'RESULTS ENTERED') {
        await labApi.generateLabReport(reqId, 'Lab Assistant');
        Alert.alert('Report Generated', `Diagnostic report ready for ${item.patientName || item.patient_name}.`);
        setRequests((prev) =>
          prev.map((q) => ((q.id === reqId || q._id === reqId) ? { ...q, status: 'REPORT READY' } : q))
        );
      } else {
        onNavigateToReport(reqId, item);
      }
    } catch (err: any) {
      Alert.alert('Action Failed', getApiErrorMessage(err));
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedReqForResult) return;
    if (!resultInput.trim()) {
      Alert.alert('Required', 'Please enter observed result value.');
      return;
    }
    const reqId = selectedReqForResult.id || selectedReqForResult._id;
    // Get tests ordered from the request (test_catalog_id is required by backend)
    const testsOrdered = selectedReqForResult.tests_ordered || [];
    const testCatalogId = testsOrdered[0] || paramInput.trim() || 'unknown';

    // Determine if result is abnormal based on reference range
    const numVal = parseFloat(resultInput.trim());
    let isAbnormal = false;
    if (refRangeInput.includes('-')) {
      const parts = refRangeInput.split('-').map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(numVal)) {
        isAbnormal = numVal < parts[0] || numVal > parts[1];
      }
    }

    try {
      setSubmittingResult(true);
      // Backend schema: results[{test_catalog_id*, value?, value_text?, unit, reference_range, is_abnormal, is_critical}], entered_by*, status
      await labApi.submitLabResults(reqId, {
        results: [
          {
            test_catalog_id: testCatalogId,
            value: isNaN(numVal) ? undefined : numVal,
            value_text: isNaN(numVal) ? resultInput.trim() : undefined,
            unit: unitInput.trim() || undefined,
            reference_range: refRangeInput.trim() || undefined,
            is_abnormal: isAbnormal,
            is_critical: false,
          },
        ],
        entered_by: 'Lab Assistant',
        status: 'RESULTS_ENTERED',
      });
      setShowResultModal(false);
      setResultInput('');
      setParamInput('');
      setUnitInput('');
      setRefRangeInput('');
      Alert.alert('Results Recorded ✅', 'Lab results saved to the hospital database.');
      setRequests((prev) =>
        prev.map((q) => ((q.id === reqId || q._id === reqId) ? { ...q, status: 'RESULTS_ENTERED' } : q))
      );
    } catch (err: any) {
      Alert.alert('Submission Failed', getApiErrorMessage(err));
    } finally {
      setSubmittingResult(false);
    }
  };

  // Use EXACT backend enum strings for status badge styling
  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      case 'REQUESTED':
        return { bg: '#E0F2FE', text: '#0284C7' };
      case 'ACKNOWLEDGED':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'REFERRED_TO_LAB':
      case 'REFERRED TO LAB':
        return { bg: '#EDE9FE', text: '#7C3AED' };
      case 'PATIENT_ARRIVED_AT_LAB':
      case 'PATIENT ARRIVED AT LAB':
        return { bg: '#E0F2FE', text: '#0369A1' };
      case 'SAMPLE_COLLECTION_IN_PROCESS':
      case 'SAMPLE COLLECTION IN PROCESS':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'SAMPLE_COLLECTED':
      case 'SAMPLE COLLECTED':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'SAMPLE_RECEIVED_IN_LAB':
      case 'SAMPLE RECEIVED IN LAB':
        return { bg: '#D1FAE5', text: '#059669' };
      case 'TEST_IN_PROCESS':
      case 'IN PROCESS':
        return { bg: '#FEF9C3', text: '#CA8A04' };
      case 'RESULTS_ENTERED':
      case 'RESULTS ENTERED':
        return { bg: '#EDE9FE', text: '#7C3AED' };
      case 'RESULTS_VERIFIED':
      case 'RESULTS VERIFIED':
        return { bg: '#F0FDF4', text: '#16A34A' };
      case 'REPORT_READY':
      case 'REPORT READY':
        return { bg: '#D1FAE5', text: '#059669' };
      case 'REPORT_RELEASED':
      case 'REPORT RELEASED':
        return { bg: '#ECFDF5', text: '#047857' };
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  return (
    <View style={styles.root}>
      {/* Top App Header with Stethoscope Banner */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onOpenDrawer} style={styles.hamburgerBtn}>
            <Feather name="menu" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Image
            source={require('../../assets/swastik_large_brand_transparent.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
      >
        {/* Title & Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Tests &amp; Samples</Text>
          <Text style={styles.subTitle}>
            {activeTab === 'samples'
              ? 'Manage laboratory requests and sample collection.'
              : 'Explore our comprehensive range of laboratory tests.'}
          </Text>
        </View>

        {/* Segmented Tabs (Image 3 & 5) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'samples' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('samples')}
          >
            <MaterialCommunityIcons
              name="flask-outline"
              size={18}
              color={activeTab === 'samples' ? '#0F766E' : '#64748B'}
            />
            <Text
              style={[styles.tabButtonText, activeTab === 'samples' && styles.tabButtonTextActive]}
            >
              Samples &amp; Requests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'catalog' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('catalog')}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={activeTab === 'catalog' ? '#0F766E' : '#64748B'}
            />
            <Text
              style={[styles.tabButtonText, activeTab === 'catalog' && styles.tabButtonTextActive]}
            >
              Test Catalog
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: SAMPLES & REQUESTS */}
        {activeTab === 'samples' && (
          <View>
            {/* Search Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search patient name, request ID or sample ID..."
                placeholderTextColor="#94A3B8"
                value={samplesSearch}
                onChangeText={setSamplesSearch}
              />
            </View>

            {/* Status Dropdown */}
            <TouchableOpacity
              style={styles.dropdownToggle}
              activeOpacity={0.8}
              onPress={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            >
              <Text style={styles.dropdownToggleText}>{statusFilter}</Text>
              <Feather
                name={isStatusDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#64748B"
              />
            </TouchableOpacity>

            {isStatusDropdownOpen && (
              <View style={styles.dropdownMenu}>
                {[
                  'All Status',
                  'REQUESTED',
                  'ACKNOWLEDGED',
                  'REFERRED TO LAB',
                  'SAMPLE COLLECTED',
                  'TEST IN PROCESS',
                  'RESULTS ENTERED',
                  'REPORT READY',
                ].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.dropdownItem, statusFilter === st && styles.dropdownItemActive]}
                    onPress={() => {
                      setStatusFilter(st);
                      setIsStatusDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        statusFilter === st && styles.dropdownItemTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* List Cards */}
            {loading ? (
              <ActivityIndicator color="#0F766E" style={{ marginVertical: 30 }} />
            ) : (
              <View style={styles.cardsList}>
                {filteredRequests.map((item) => {
                  const badge = getStatusBadgeStyle(item.status);
                  return (
                    <View key={item.id} style={styles.requestCard}>
                      <View style={styles.cardHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.patientName}>{item.patientName}</Text>
                          <Text style={styles.testsName}>{item.tests}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardMetaRow}>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Req ID</Text>
                          <Text style={styles.metaValue}>{item.id}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Sample ID</Text>
                          <Text style={styles.metaValue}>{item.sampleId || '—'}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Date &amp; Time</Text>
                          <Text style={styles.metaValue}>{item.date}</Text>
                        </View>
                      </View>

                      <View style={styles.cardActionRow}>
                        {item.status === 'REQUESTED' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnTealFilled]}
                            onPress={() => handleAction(item)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.actionBtnFilledText}>Acknowledge</Text>
                          </TouchableOpacity>
                        )}
                        {item.status === 'ACKNOWLEDGED' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnOutline]}
                            onPress={() => handleAction(item)}
                          >
                            <MaterialCommunityIcons name="test-tube" size={15} color="#0F766E" />
                            <Text style={styles.actionBtnOutlineText}>Collect</Text>
                          </TouchableOpacity>
                        )}
                        {item.status === 'REFERRED TO LAB' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnOutline]}
                            onPress={() => handleAction(item)}
                          >
                            <MaterialCommunityIcons name="truck-delivery" size={15} color="#0F766E" />
                            <Text style={styles.actionBtnOutlineText}>Track</Text>
                          </TouchableOpacity>
                        )}
                        {item.status === 'SAMPLE COLLECTED' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnOutline]}
                            onPress={() => handleAction(item)}
                          >
                            <Ionicons name="settings-outline" size={15} color="#0F766E" />
                            <Text style={styles.actionBtnOutlineText}>Process</Text>
                          </TouchableOpacity>
                        )}
                        {item.status === 'TEST IN PROCESS' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnOutline]}
                            onPress={() => handleAction(item)}
                          >
                            <Ionicons name="document-text-outline" size={15} color="#0F766E" />
                            <Text style={styles.actionBtnOutlineText}>View</Text>
                          </TouchableOpacity>
                        )}
                        {item.status === 'RESULTS ENTERED' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnOutline]}
                            onPress={() => handleAction(item)}
                          >
                            <Ionicons name="document-text-outline" size={15} color="#0F766E" />
                            <Text style={styles.actionBtnOutlineText}>Report</Text>
                          </TouchableOpacity>
                        )}
                        {item.status === 'REPORT READY' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnOutline]}
                            onPress={() => handleAction(item)}
                          >
                            <Ionicons name="eye-outline" size={15} color="#0F766E" />
                            <Text style={styles.actionBtnOutlineText}>View</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: TEST CATALOG (Image 5) */}
        {activeTab === 'catalog' && (
          <View>
            {/* Search Input */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search test name or category"
                placeholderTextColor="#94A3B8"
                value={catalogSearch}
                onChangeText={setCatalogSearch}
              />
            </View>

            {/* Category Filter */}
            <TouchableOpacity
              style={styles.dropdownToggle}
              activeOpacity={0.8}
              onPress={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            >
              <Text style={styles.dropdownToggleText}>{categoryFilter}</Text>
              <Feather
                name={isCategoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#64748B"
              />
            </TouchableOpacity>

            {isCategoryDropdownOpen && (
              <View style={styles.dropdownMenu}>
                {[
                  'All Categories',
                  'Hematology',
                  'Biochemistry',
                  'Liver Function',
                  'Kidney Function',
                  'Endocrinology',
                  'Lipid Profile',
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.dropdownItem, categoryFilter === cat && styles.dropdownItemActive]}
                    onPress={() => {
                      setCategoryFilter(cat);
                      setIsCategoryDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        categoryFilter === cat && styles.dropdownItemTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Catalog Cards */}
            <View style={styles.cardsList}>
              {filteredCatalog.map((item) => (
                <View key={item.id} style={styles.catalogCard}>
                  <View style={styles.catalogTopRow}>
                    <View style={styles.catalogCategoryPill}>
                      <Text style={styles.catalogCategoryText}>{item.category}</Text>
                    </View>
                    <View style={styles.catalogPricePill}>
                      <Text style={styles.catalogPriceText}>₹ {item.price}</Text>
                    </View>
                  </View>

                  <Text style={styles.catalogTestName}>{item.name}</Text>

                  <View style={styles.catalogDetailsRow}>
                    <View style={styles.catalogDetailCol}>
                      <View style={styles.detailIconRow}>
                        <Ionicons name="water-outline" size={13} color="#0F766E" />
                        <Text style={styles.detailTitle}>Sample Type</Text>
                      </View>
                      <Text style={styles.detailValue}>{item.sampleType}</Text>
                    </View>

                    <View style={styles.catalogDetailCol}>
                      <View style={styles.detailIconRow}>
                        <Ionicons name="time-outline" size={13} color="#0F766E" />
                        <Text style={styles.detailTitle}>Turnaround Time</Text>
                      </View>
                      <Text style={styles.detailValue}>{item.turnaround}</Text>
                    </View>

                    <View style={styles.catalogDetailCol}>
                      <View style={styles.detailIconRow}>
                        <Ionicons name="bar-chart-outline" size={13} color="#0F766E" />
                        <Text style={styles.detailTitle}>Reference Range</Text>
                      </View>
                      <Text style={styles.detailValue}>{item.refRange}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Enter Lab Results Modal */}
      <Modal visible={showResultModal} transparent animationType="slide">
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Diagnostic Results</Text>
              <TouchableOpacity onPress={() => setShowResultModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              Patient: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{selectedReqForResult?.patientName || selectedReqForResult?.patient_name || 'Patient'}</Text> ({selectedReqForResult?.id || selectedReqForResult?._id})
            </Text>

            <View style={{ marginBottom: 10 }}>
              <Text style={styles.inputLabel}>Test / Parameter Name</Text>
              <TextInput
                style={styles.modalInput}
                value={paramInput}
                onChangeText={setParamInput}
                placeholder="e.g. Hemoglobin, Fasting Blood Sugar"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.inputLabel}>Observed Value *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={resultInput}
                  onChangeText={setResultInput}
                  placeholder="e.g. 13.5"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Unit</Text>
                <TextInput
                  style={styles.modalInput}
                  value={unitInput}
                  onChangeText={setUnitInput}
                  placeholder="e.g. g/dL, mg/dL"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={styles.inputLabel}>Reference Interval / Range</Text>
              <TextInput
                style={styles.modalInput}
                value={refRangeInput}
                onChangeText={setRefRangeInput}
                placeholder="e.g. 12.0 - 16.0"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSubmitResult}
              disabled={submittingResult}
              activeOpacity={0.8}
            >
              {submittingResult ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Save & Record Results</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stethoscopeBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 70,
    opacity: 0.8,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hamburgerBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerLogo: {
    width: 155,
    height: 42,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#E6FFFA',
    borderWidth: 1,
    borderColor: '#0F766E',
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F766E',
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  dropdownToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDFA',
  },
  dropdownItemText: {
    fontSize: 12.5,
    color: '#475569',
  },
  dropdownItemTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  cardsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  patientName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  testsName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
    marginTop: 2,
  },
  cardActionRow: {
    alignItems: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnTealFilled: {
    backgroundColor: '#0F766E',
  },
  actionBtnFilledText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11.5,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
  },
  actionBtnOutlineText: {
    color: '#0F766E',
    fontWeight: '700',
    fontSize: 11.5,
  },
  catalogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  catalogTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catalogCategoryPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catalogCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  catalogPricePill: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catalogPriceText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  catalogTestName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  catalogDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  catalogDetailCol: {
    flex: 1,
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  detailTitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  modalSubmitBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
