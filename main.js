// ==UserScript==
// @name         EhancedSIER
// @namespace    k00lagin.enhanced-sier
// @version      0.0.2
// @description
// @author       Vsevolod Kulagin
// @match        http://172.153.153.48/ais/*
// @grant        none
// ==/UserScript==


(function () {
	'use strict';

	let ES = {
		aliases: {
			719747: 'прописка',
		}
	};

	function checkLoadState() {
		if (!document.querySelector('.navigation.navigation-main')) {
			return;
		}
		else {
			init();
		}
	}

	async function getServiceList() {
		window.serviceList = [];
		let response = await fetch('http://172.153.153.48/api/v1/search/subservices', {
			method: 'POST',
			headers: {
				Accept: 'application/hal+json',
				Authorization: 'Bearer ' + localStorage.accessToken,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				"search": {
					"search": [{
						"field": "units.id",
						"operator": "eq",
						"value": "58bd51815744bf06e001b57b"
					}]
				},
				"size": 200,
				"sort": "serviceCode,DESC",
				"prj": "servicesList"
			})
		});
		if (response.ok) {
			let subservices = await response.json();
			subservices = subservices.content
			subservices.forEach(subservice => {
				let service = {
					id: subservice._id,
					sid: subservice.serviceId.split('_')[3],
					name: subservice.serviceName
				}
				window.serviceList.push(service);
			});

		} else {
			console.warn("Ошибка HTTP: " + response.status);
		}
	}

	function getFilteredList(string) {
		let words = string.split(' ');
		let filteredList = serviceList.filter(service => {
			return words.every(word => {
				if (ES.aliases[service.sid] && ES.aliases[service.sid].indexOf(word) !== -1) {
					return true;
				}
				if (service.sid.indexOf(word) !== -1) {
					return true;
				}
				if (service.name.indexOf(word) !== -1) {
					return true;
				}
			});
		});
		return filteredList;
	}

	function init() {
		getServiceList();
		let startAppealTrigger = document.createElement('button');
		let navigationContainer = document.querySelector('.navigation.navigation-main');
		navigationContainer.style = `
			display: flex;
			flex-flow: column nowrap;
		`;
		startAppealTrigger.classList.add('icon-magic-wand');
		startAppealTrigger.style = `
			order: -1;
			height: 40px;
			background-color: inherit;
			border: 0;
		`;
		startAppealTrigger.addEventListener('click', openServiceSearchDialog);
		navigationContainer.appendChild(startAppealTrigger);
		clearInterval(initInterval);
		createServiceSearchDialog()
	}

	function createServiceSearchDialog() {
		let dialog = document.createElement('dialog');
		dialog.classList.add('service-search-dialog', 'hidden');
		dialog.style = `
			width: 600px;
			height: calc(100% - 100px);
			position: fixed;
			top: 60px;
			z-index: 10;
			display: flex;
			flex-flow: column nowrap;
		`;
		let header = document.createElement('header');
		header.style = `
			display: flex;
		`;
		let serviceSearchInput = document.createElement('input');
		serviceSearchInput.classList.add('service-search-input', 'form-control');
		serviceSearchInput.addEventListener('keyup', updateServiceList);
		header.appendChild(serviceSearchInput);
		let closeDialogTrigger = document.createElement('button');
		closeDialogTrigger.addEventListener('click', closeServiceSearchDialog);
		closeDialogTrigger.classList.add('icon-cross');
		closeDialogTrigger.style = `
			margin-left: 8px;
			background-color: transparent;
			border: 0;
		`;
		header.appendChild(closeDialogTrigger);
		dialog.appendChild(header);
		let serviceListNode = document.createElement('ul');
		serviceListNode.classList.add('service-list-node');
		serviceListNode.style = `
			overflow-y: scroll;
			list-style: none;
			padding: 0;
		`;
		dialog.appendChild(serviceListNode);
		document.body.appendChild(dialog);
	}

	function updateServiceList() {
		let filteredList = [];
		let serviceListNode = document.querySelector('.service-list-node');
		if (document.querySelector('.service-search-input').value === '') {
			filteredList = serviceList;
		}
		else {
			filteredList = getFilteredList(document.querySelector('.service-search-input').value);
		}
		serviceListNode.innerHTML = '';
		filteredList.forEach(service => {
			let listItem = document.createElement('li');
			let serviceCode = document.createElement('span');
			serviceCode.textContent = service.sid;
			serviceCode.style = `
				margin-right: 8px;
			`;
			listItem.appendChild(serviceCode);
			let serviceLink = document.createElement('a');
			serviceLink.textContent = service.name;
			serviceLink.href = 'http://172.153.153.48/ais/appeals/create/' + service.id;
			listItem.appendChild(serviceLink);
			serviceListNode.appendChild(listItem);
		})
	}

	function openServiceSearchDialog() {
		document.querySelector('.service-search-input').value = '';
		updateServiceList();
		document.querySelector('.service-search-dialog').classList.remove('hidden');
		document.querySelector('.service-search-input').focus();
	}
	function closeServiceSearchDialog() {
		document.querySelector('.service-search-dialog').classList.add('hidden');
	}

	let initInterval = setInterval(checkLoadState, 100);
})();
